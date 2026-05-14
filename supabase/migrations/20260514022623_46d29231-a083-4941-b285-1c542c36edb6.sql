
-- Roles enum
create type public.app_role as enum ('admin', 'student');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- has_role helper
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Lessons
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  order_index int not null unique,
  title text not null,
  description text not null default '',
  content text not null,
  target_wpm int not null default 20,
  created_at timestamptz not null default now()
);
alter table public.lessons enable row level security;

-- Lesson progress
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  best_wpm int not null default 0,
  best_accuracy numeric(5,2) not null default 0,
  completed boolean not null default false,
  attempts int not null default 0,
  last_attempt_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
alter table public.lesson_progress enable row level security;

-- Payments (monthly fees)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference_month date not null,
  amount numeric(10,2) not null,
  paid_at timestamptz not null default now(),
  payment_method text not null default 'pix',
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, reference_month)
);
alter table public.payments enable row level security;

-- RLS Policies

-- profiles
create policy "users view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "admins view all profiles" on public.profiles
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "admins update profiles" on public.profiles
  for update using (public.has_role(auth.uid(), 'admin'));
create policy "admins insert profiles" on public.profiles
  for insert with check (public.has_role(auth.uid(), 'admin') or auth.uid() = id);
create policy "admins delete profiles" on public.profiles
  for delete using (public.has_role(auth.uid(), 'admin'));

-- user_roles
create policy "users view own roles" on public.user_roles
  for select using (auth.uid() = user_id);
create policy "admins view all roles" on public.user_roles
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- lessons
create policy "authenticated view lessons" on public.lessons
  for select to authenticated using (true);
create policy "admins manage lessons" on public.lessons
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- lesson_progress
create policy "users view own progress" on public.lesson_progress
  for select using (auth.uid() = user_id);
create policy "admins view all progress" on public.lesson_progress
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "users upsert own progress" on public.lesson_progress
  for insert with check (auth.uid() = user_id);
create policy "users update own progress" on public.lesson_progress
  for update using (auth.uid() = user_id);

-- payments
create policy "users view own payments" on public.payments
  for select using (auth.uid() = user_id);
create policy "admins view all payments" on public.payments
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage payments" on public.payments
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Trigger: on signup, create profile + role
-- First user becomes admin; subsequent users become students
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _is_first boolean;
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );

  select not exists(select 1 from public.user_roles where role = 'admin') into _is_first;

  insert into public.user_roles (user_id, role)
  values (new.id, case when _is_first then 'admin'::public.app_role else 'student'::public.app_role end);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
