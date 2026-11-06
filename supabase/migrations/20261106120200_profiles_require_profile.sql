-- Профили постановщиков видит только пользователь, у которого есть профиль.
-- Иначе любая сессия без профиля (например, удалённого сотрудника) читала бы
-- имена и id всех постановщиков.

create or replace function private.has_profile()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()));
$$;

revoke execute on function private.has_profile() from public, anon;
grant  execute on function private.has_profile() to authenticated;

drop policy profiles_select on public.profiles;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (role = 'manager' and (select private.has_profile()))
    or (select private.is_manager())
  );
