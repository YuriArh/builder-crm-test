-- =========================================================
-- Защита данных: права на колонки, RLS, смена статуса только через функцию,
-- стартовая запись истории триггером.
-- =========================================================

-- ---------- 1. Вспомогательные функции в закрытой схеме private ----------
-- Схема не открыта через API, напрямую эти функции не вызвать.
create schema if not exists private;
grant usage on schema private to authenticated;

-- Текущий пользователь — постановщик?
-- security definer: читает profiles в обход RLS, иначе правило на profiles зациклится
create or replace function private.is_manager()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'manager'
  );
$$;

-- Пользователь с этим id — исполнитель? (проверка при создании задачи)
create or replace function private.is_executor(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'executor'
  );
$$;

revoke execute on function private.is_manager()      from public, anon;
revoke execute on function private.is_executor(uuid) from public, anon;
grant  execute on function private.is_manager()      to authenticated;
grant  execute on function private.is_executor(uuid) to authenticated;

-- ---------- 2. Права на таблицы и колонки ----------
-- Supabase по умолчанию даёт anon/authenticated всё — забираем
revoke all on public.profiles, public.objects, public.tasks, public.task_status_history
  from anon, authenticated;

-- Чтение: дальше строки фильтрует RLS
grant select on public.profiles, public.objects, public.tasks, public.task_status_history
  to authenticated;

-- Объекты: created_by и created_at подставляются по умолчанию
grant insert (name, address), update (name, address), delete
  on public.objects to authenticated;

-- Задачи: status, author_id, created_at при создании не передать,
-- а assignee_id после создания не изменить
grant insert (object_id, title, description, assignee_id),
      update (object_id, title, description),
      delete
  on public.tasks to authenticated;

-- profiles и task_status_history: записи с клиента нет совсем

-- ---------- 3. RLS ----------
alter table public.profiles            enable row level security;
alter table public.objects             enable row level security;
alter table public.tasks               enable row level security;
alter table public.task_status_history enable row level security;

-- profiles: каждый видит себя, все видят постановщиков, постановщик видит всех
-- (уточнено в миграции 20261106120200: постановщиков видит только пользователь с профилем)
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or role = 'manager'
    or (select private.is_manager())
  );

-- objects: постановщик видит все, исполнитель — только те, где у него есть задача
create policy objects_select on public.objects
  for select to authenticated
  using (
    (select private.is_manager())
    or exists (
      select 1 from public.tasks t
      where t.object_id = objects.id
        and t.assignee_id = (select auth.uid())
    )
  );

create policy objects_insert on public.objects
  for insert to authenticated
  with check ((select private.is_manager()));

create policy objects_update on public.objects
  for update to authenticated
  using ((select private.is_manager()))
  with check ((select private.is_manager()));

create policy objects_delete on public.objects
  for delete to authenticated
  using ((select private.is_manager()));

-- tasks
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    (select private.is_manager())
    or assignee_id = (select auth.uid())
  );

-- создаёт только постановщик, исполнитель обязан иметь роль executor
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    (select private.is_manager())
    and private.is_executor(assignee_id)
  );

-- редактирует любой постановщик, пока задача не принята
create policy tasks_update on public.tasks
  for update to authenticated
  using ((select private.is_manager()) and status <> 'accepted')
  with check ((select private.is_manager()) and status <> 'accepted');

-- удаляет любой постановщик в любом статусе (история удаляется каскадом)
create policy tasks_delete on public.tasks
  for delete to authenticated
  using ((select private.is_manager()));

-- task_status_history: только чтение — постановщик видит всё, исполнитель — историю своих задач
create policy history_select on public.task_status_history
  for select to authenticated
  using (
    (select private.is_manager())
    or exists (
      select 1 from public.tasks t
      where t.id = task_status_history.task_id
        and t.assignee_id = (select auth.uid())
    )
  );

-- ---------- 4. Стартовая запись истории «— → Новая» при создании задачи ----------
create or replace function private.log_task_created()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.task_status_history (task_id, from_status, to_status, changed_by)
  values (new.id, null, new.status, new.author_id);
  return null;
end;
$$;

revoke execute on function private.log_task_created() from public, anon, authenticated;

create trigger tasks_log_created
  after insert on public.tasks
  for each row execute function private.log_task_created();

-- ---------- 5. Смена статуса — единственный способ поменять status ----------
create or replace function public.change_task_status(
  p_task_id    bigint,
  p_new_status public.task_status,
  p_comment    text default null
)
returns public.tasks
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_role       public.app_role;
  v_task       public.tasks;
  v_old_status public.task_status;
  v_comment    text := nullif(btrim(p_comment), '');
  v_allowed    boolean;
begin
  if v_uid is null then
    raise exception 'Требуется вход в систему' using errcode = '28000';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is null then
    raise exception 'Профиль пользователя не найден' using errcode = '42501';
  end if;

  -- блокируем строку: два одновременных перехода не пройдут оба
  select * into v_task from public.tasks where id = p_task_id for update;

  -- для исполнителя чужая задача неотличима от несуществующей
  if not found or (v_role = 'executor' and v_task.assignee_id <> v_uid) then
    raise exception 'Задача не найдена' using errcode = 'P0002';
  end if;

  v_old_status := v_task.status;

  -- таблица переходов из ТЗ
  if v_role = 'executor' then
    v_allowed := (v_old_status = 'new'         and p_new_status = 'in_progress')
              or (v_old_status = 'in_progress' and p_new_status = 'review')
              or (v_old_status = 'rework'      and p_new_status = 'in_progress');
  else -- manager
    v_allowed := v_old_status = 'review' and p_new_status in ('accepted', 'rework');
  end if;

  if not v_allowed then
    raise exception 'Переход % → % недоступен', v_old_status, p_new_status
      using errcode = '42501';
  end if;

  if p_new_status = 'rework' and v_comment is null then
    raise exception 'Для возврата на доработку нужен комментарий' using errcode = '22023';
  end if;

  update public.tasks
     set status = p_new_status
   where id = p_task_id
  returning * into v_task;

  insert into public.task_status_history (task_id, from_status, to_status, comment, changed_by)
  values (p_task_id, v_old_status, p_new_status, v_comment, v_uid);

  return v_task;
end;
$$;

revoke execute on function public.change_task_status(bigint, public.task_status, text) from public, anon;
grant  execute on function public.change_task_status(bigint, public.task_status, text) to authenticated;
