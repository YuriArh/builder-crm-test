-- =========================================================
-- Тестовые данные. Перед запуском создайте в Dashboard
-- (Authentication → Users → Add user, «Auto Confirm User») пользователей:
--   manager@example.com  — постановщик
--   worker1@example.com — исполнитель
--   worker2@example.com — исполнитель
-- Статусы меняются через настоящую change_task_status от имени нужного
-- пользователя, поэтому история получается такой же, как из приложения.
-- =========================================================
begin;

-- Сменить статус от имени пользователя (функция живёт только в этой сессии)
create or replace function pg_temp.move(
  p_task bigint, p_user uuid, p_status public.task_status, p_comment text default null
) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform public.change_task_status(p_task, p_status, p_comment);
end $$;

do $$
declare
  v_mgr uuid; v_e1 uuid; v_e2 uuid;
  o1 bigint; o2 bigint; o3 bigint;
  t1 bigint; t2 bigint; t3 bigint; t4 bigint; t5 bigint; t6 bigint; t7 bigint;
begin
  select id into v_mgr from auth.users where email = 'manager@example.com';
  select id into v_e1  from auth.users where email = 'worker1@example.com';
  select id into v_e2  from auth.users where email = 'worker2@example.com';

  if v_mgr is null or v_e1 is null or v_e2 is null then
    raise exception 'Не найдены пользователи manager@, worker1@, worker2@ (example.com) в auth.users';
  end if;
  if exists (select 1 from public.objects) then
    raise exception 'Тестовые данные уже загружены: таблица objects не пуста';
  end if;

  -- Профили и роли
  insert into public.profiles (id, full_name, role) values
    (v_mgr, 'Анна Смирнова', 'manager'),
    (v_e1,  'Иван Петров',   'executor'),
    (v_e2,  'Сергей Козлов', 'executor')
  on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;

  -- Объекты
  insert into public.objects (name, address, created_by)
    values ('ЖК «Северный парк», корпус 2', 'г. Москва, ул. Лётчика Бабушкина, 12', v_mgr)
    returning id into o1;
  insert into public.objects (name, address, created_by)
    values ('Коттедж в Ивантеевке', 'Московская обл., г. Ивантеевка, ул. Луговая, 7', v_mgr)
    returning id into o2;
  insert into public.objects (name, address, created_by)
    values ('Складской комплекс «Восток»', 'Московская обл., г. Балашиха, Промзона, 3', v_mgr)
    returning id into o3;

  -- Задачи (стартовую запись истории «— → Новая» пишет триггер)
  insert into public.tasks (object_id, title, description, assignee_id, author_id)
    values (o1, 'Залить фундамент секции А', 'Бетон М300, приёмка с фотоотчётом', v_e1, v_mgr) returning id into t1;
  insert into public.tasks (object_id, title, description, assignee_id, author_id)
    values (o1, 'Смонтировать опалубку 2 этажа', 'По чертежу КЖ-04', v_e1, v_mgr) returning id into t2;
  insert into public.tasks (object_id, title, description, assignee_id, author_id)
    values (o1, 'Проверить армирование перекрытия', null, v_e2, v_mgr) returning id into t3;
  insert into public.tasks (object_id, title, description, assignee_id, author_id)
    values (o2, 'Уложить кровлю', 'Металлочерепица, цвет RAL 8017', v_e2, v_mgr) returning id into t4;
  insert into public.tasks (object_id, title, description, assignee_id, author_id)
    values (o2, 'Установить окна', '6 окон ПВХ, монтаж по ГОСТ', v_e1, v_mgr) returning id into t5;
  insert into public.tasks (object_id, title, description, assignee_id, author_id)
    values (o2, 'Черновая электрика', 'Разводка по проекту ЭОМ', v_e2, v_mgr) returning id into t6;
  insert into public.tasks (object_id, title, description, assignee_id, author_id)
    values (o3, 'Демонтаж старых перегородок', 'Вывоз мусора за счёт подрядчика', v_e1, v_mgr) returning id into t7;

  -- Переходы через настоящую функцию
  perform pg_temp.move(t1, v_e1,  'in_progress');            -- t1: Принята
  perform pg_temp.move(t1, v_e1,  'review');
  perform pg_temp.move(t1, v_mgr, 'accepted');

  perform pg_temp.move(t2, v_e1,  'in_progress');            -- t2: На проверке
  perform pg_temp.move(t2, v_e1,  'review');
                                                             -- t3: Новая
  perform pg_temp.move(t4, v_e2,  'in_progress');            -- t4: В работе

  perform pg_temp.move(t5, v_e1,  'in_progress');            -- t5: На доработке
  perform pg_temp.move(t5, v_e1,  'review');
  perform pg_temp.move(t5, v_mgr, 'rework', 'Два окна установлены без пароизоляции, переделать');

  perform pg_temp.move(t6, v_e2,  'in_progress');            -- t6: доработка → снова В работе
  perform pg_temp.move(t6, v_e2,  'review');
  perform pg_temp.move(t6, v_mgr, 'rework', 'Нет маркировки линий в щитке');
  perform pg_temp.move(t6, v_e2,  'in_progress');
                                                             -- t7: Новая
  perform set_config('request.jwt.claims', '', true);

  -- В одной транзакции у всех записей одинаковое время. Разносим их по часам,
  -- чтобы история выглядела правдоподобно (порядок записей сохраняется)
  with ordered as (
    select id, row_number() over (order by id desc) as rn from public.task_status_history
  )
  update public.task_status_history h
     set changed_at = now() - o.rn * interval '5 hours'
    from ordered o where o.id = h.id;

  update public.tasks t
     set created_at = (select min(changed_at) from public.task_status_history h where h.task_id = t.id);
end $$;

commit;
