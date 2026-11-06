-- =========================================================
-- Проверка защиты: запросы от имени анонима, исполнителя worker2,
-- постановщика и сессии без профиля. Каждая проверка откатывается —
-- данные не меняются. Результат: таблица, во всех строках passed = true.
-- Запускать после seed.sql (SQL Editor или psql).
-- =========================================================
create temp table if not exists security_checks (
  n int generated always as identity,
  check_name text, run_as text, expected text, actual text, passed boolean
);
truncate security_checks restart identity;

do $$
declare
  v_mgr uuid := (select id from auth.users where email = 'manager@example.com');
  v_e1  uuid := (select id from auth.users where email = 'worker1@example.com');
  v_e2  uuid := (select id from auth.users where email = 'worker2@example.com');
  v_no_profile uuid := gen_random_uuid(); -- id без профиля = вошедший пользователь без роли
  v_foreign    bigint; -- задача worker1, чужая для worker2
  v_own_new    bigint; -- задача worker2 в статусе «Новая»
  v_own_object bigint;
  v_review     bigint;
  v_accepted   bigint;
  v_total int; v_own int; v_own_objects int;
  r record;
  v_result text;
begin
  select id into v_foreign from public.tasks where assignee_id = v_e1 order by id limit 1;
  select id, object_id into v_own_new, v_own_object
    from public.tasks where assignee_id = v_e2 and status = 'new' limit 1;
  select id into v_review   from public.tasks where status = 'review'   limit 1;
  select id into v_accepted from public.tasks where status = 'accepted' limit 1;
  select count(*) into v_total from public.tasks;
  select count(*) into v_own   from public.tasks where assignee_id = v_e2;
  select count(distinct object_id) into v_own_objects from public.tasks where assignee_id = v_e2;

  for r in
    select * from (values
      ('Аноним не может читать задачи', 'anon', null::uuid,
        'select count(*)::text from public.tasks', 'ОШИБКА'),
      ('Сессия без профиля не видит профили', 'authenticated', v_no_profile,
        'select count(*)::text from public.profiles', '0'),

      (format('Исполнитель видит только свои задачи (всего в базе %s)', v_total), 'authenticated', v_e2,
        'select count(*)::text from public.tasks', v_own::text),
      ('Исполнитель видит только объекты со своими задачами', 'authenticated', v_e2,
        'select count(*)::text from public.objects', v_own_objects::text),
      ('Исполнитель не видит чужую задачу по id', 'authenticated', v_e2,
        format('select count(*)::text from public.tasks where id = %s', v_foreign), '0'),
      ('Исполнитель не видит историю чужой задачи', 'authenticated', v_e2,
        format('select count(*)::text from public.task_status_history where task_id = %s', v_foreign), '0'),
      ('Исполнитель не может изменить чужую задачу', 'authenticated', v_e2,
        format('with x as (update public.tasks set title = ''взлом'' where id = %s returning 1) select count(*)::text from x', v_foreign), '0'),
      ('Исполнитель не может поменять статус прямым UPDATE', 'authenticated', v_e2,
        format('with x as (update public.tasks set status = ''accepted'' where id = %s returning 1) select count(*)::text from x', v_own_new), 'ОШИБКА'),
      ('Исполнитель не может сменить статус чужой задачи', 'authenticated', v_e2,
        format('select (public.change_task_status(%s, ''in_progress'')).status::text', v_foreign), 'ОШИБКА'),
      ('Запрещённый переход «Новая → Принята» не проходит', 'authenticated', v_e2,
        format('select (public.change_task_status(%s, ''accepted'')).status::text', v_own_new), 'ОШИБКА'),
      ('Разрешённый переход «Новая → В работе» проходит', 'authenticated', v_e2,
        format('select (public.change_task_status(%s, ''in_progress'')).status::text', v_own_new), 'in_progress'),
      ('Нельзя подделать запись истории', 'authenticated', v_e2,
        format('with x as (insert into public.task_status_history (task_id, from_status, to_status, changed_by) values (%s, ''review'', ''accepted'', %L) returning 1) select count(*)::text from x', v_own_new, v_e2), 'ОШИБКА'),
      ('Нельзя удалить историю', 'authenticated', v_e2,
        'with x as (delete from public.task_status_history returning 1) select count(*)::text from x', 'ОШИБКА'),
      ('Исполнитель не может сделать себя постановщиком', 'authenticated', v_e2,
        format('with x as (update public.profiles set role = ''manager'' where id = %L returning 1) select count(*)::text from x', v_e2), 'ОШИБКА'),
      ('Исполнитель не может создать задачу', 'authenticated', v_e2,
        format('with x as (insert into public.tasks (object_id, title, assignee_id) values (%s, ''Своя задача'', %L) returning 1) select count(*)::text from x', v_own_object, v_e2), 'ОШИБКА'),

      ('Постановщик видит все задачи', 'authenticated', v_mgr,
        'select count(*)::text from public.tasks', v_total::text),
      ('Возврат на доработку без комментария не проходит', 'authenticated', v_mgr,
        format('select (public.change_task_status(%s, ''rework'')).status::text', v_review), 'ОШИБКА'),
      ('Возврат на доработку с комментарием проходит', 'authenticated', v_mgr,
        format('select (public.change_task_status(%s, ''rework'', ''Переделать'')).status::text', v_review), 'rework'),
      ('Принятую задачу нельзя редактировать', 'authenticated', v_mgr,
        format('with x as (update public.tasks set title = ''правка'' where id = %s returning 1) select count(*)::text from x', v_accepted), '0')
    ) as c(check_name, run_as, user_id, sql, expected)
  loop
    begin
      perform set_config('request.jwt.claims',
        json_build_object('sub', r.user_id, 'role', r.run_as)::text, true);
      execute format('set local role %I', r.run_as);
      execute r.sql into v_result;
      -- искусственная ошибка откатывает всё, что сделала проверка
      raise exception using errcode = 'P0099', message = coalesce(v_result, 'null');
    exception when others then
      v_result := case when sqlstate = 'P0099' then sqlerrm else 'ОШИБКА: ' || sqlerrm end;
    end;

    insert into security_checks (check_name, run_as, expected, actual, passed)
    values (
      r.check_name,
      case
        when r.user_id = v_mgr then 'постановщик'
        when r.user_id = v_e2 then 'worker2'
        when r.user_id = v_no_profile then 'без профиля'
        else r.run_as
      end,
      r.expected, v_result,
      (r.expected = 'ОШИБКА' and v_result like 'ОШИБКА%') or v_result = r.expected
    );
  end loop;
end $$;

select check_name, run_as, expected, actual, passed from security_checks order by n;
