-- =========================================================
-- Мини-CRM «Объекты и задачи»: типы, таблицы, ограничения, индексы.
-- Права доступа (GRANT/RLS) и функции — в следующей миграции.
-- =========================================================

-- ---------- Типы ----------
create type public.app_role as enum ('manager', 'executor');

create type public.task_status as enum (
  'new',          -- Новая
  'in_progress',  -- В работе
  'review',       -- На проверке
  'accepted',     -- Принята
  'rework'        -- На доработке
);

-- ---------- Профили (роли пользователей) ----------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null check (btrim(full_name) <> '' and char_length(full_name) <= 200),
  role       public.app_role not null,
  created_at timestamptz not null default now()
);

-- ---------- Объекты (стройки) ----------
create table public.objects (
  id         bigint generated always as identity primary key,
  name       text not null check (btrim(name) <> '' and char_length(name) <= 200),
  address    text not null check (btrim(address) <> '' and char_length(address) <= 500),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index objects_created_by_idx on public.objects (created_by);

-- ---------- Задачи ----------
create table public.tasks (
  id          bigint generated always as identity primary key,
  object_id   bigint not null references public.objects (id) on delete cascade,
  title       text not null check (btrim(title) <> '' and char_length(title) <= 200),
  description text check (char_length(description) <= 5000),
  assignee_id uuid not null references public.profiles (id) on delete restrict,
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  status      public.task_status not null default 'new',
  created_at  timestamptz not null default now()
);

create index tasks_object_id_idx   on public.tasks (object_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_author_id_idx   on public.tasks (author_id);

-- ---------- История смены статусов ----------
create table public.task_status_history (
  id          bigint generated always as identity primary key,
  task_id     bigint not null references public.tasks (id) on delete cascade,
  from_status public.task_status,            -- null только у стартовой записи «— → Новая»
  to_status   public.task_status not null,
  comment     text check (char_length(comment) <= 2000),
  changed_by  uuid not null references public.profiles (id) on delete restrict,
  changed_at  timestamptz not null default now(),

  -- стартовая запись: из «ничего» только в «Новая»; иначе статус должен меняться
  constraint history_valid_transition check (
    (from_status is null and to_status = 'new')
    or (from_status is not null and from_status <> to_status)
  ),
  -- возврат на доработку — только с непустым комментарием
  constraint history_rework_requires_comment check (
    to_status <> 'rework' or (comment is not null and btrim(comment) <> '')
  )
);

create index task_status_history_task_id_idx    on public.task_status_history (task_id, changed_at);
create index task_status_history_changed_by_idx on public.task_status_history (changed_by);

-- RLS включается сразу: до появления правил доступ через API закрыт полностью
alter table public.profiles            enable row level security;
alter table public.objects             enable row level security;
alter table public.tasks               enable row level security;
alter table public.task_status_history enable row level security;
