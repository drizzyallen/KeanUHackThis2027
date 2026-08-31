-- KeanUHackThis Supabase schema
-- Authentication is handled by Supabase Auth. Do not store passwords here.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_year integer not null default 2026,
  phone text not null,
  age integer not null check (age >= 13 and age <= 120),
  gender text,
  college_university text not null,
  major text not null,
  year_of_study text check (year_of_study in ('Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate')),
  level_of_study text check (level_of_study in ('Undergraduate', 'Graduate', 'Bootcamp/Other')),
  team_status text not null check (team_status in ('Solo', 'Find at event', 'Create a Team', 'Join a Team')),
  intended_track text not null,
  tshirt_size text not null check (tshirt_size in ('S', 'M', 'L', 'XL', 'XXL')),
  dietary_restrictions text,
  referral_source text,
  additional_info text,
  terms_accepted boolean not null check (terms_accepted = true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_year)
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_registrations_updated_at on public.registrations;
create trigger set_registrations_updated_at
before update on public.registrations
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.registrations enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own registrations" on public.registrations;
create policy "Users can read own registrations"
on public.registrations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own registrations" on public.registrations;
create policy "Users can create own registrations"
on public.registrations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own registrations" on public.registrations;
create policy "Users can update own registrations"
on public.registrations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
