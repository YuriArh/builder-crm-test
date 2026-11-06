-- Текст ошибки недопустимого перехода — с русскими подписями статусов,
-- как в интерфейсе: «Переход «Принята» → «На доработке» недоступен».
-- Значения enum в базе не меняются.

create or replace function private.status_label(p_status public.task_status)
returns text
language sql immutable
set search_path = ''
as $$
  select case p_status
    when 'new'         then 'Новая'
    when 'in_progress' then 'В работе'
    when 'review'      then 'На проверке'
    when 'rework'      then 'На доработке'
    when 'accepted'    then 'Принята'
  end;
$$;

revoke execute on function private.status_label(public.task_status) from public, anon, authenticated;

-- Тело как в 20261106120100_security.sql, изменён только текст ошибки перехода.
-- create or replace сохраняет выданные права (execute для authenticated).
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
    raise exception 'Переход «%» → «%» недоступен',
      private.status_label(v_old_status), private.status_label(p_new_status)
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
