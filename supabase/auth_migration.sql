-- =============================================================================
-- Phase 4 auth migration — adds user_id + is_admin to voters
-- =============================================================================
-- Run via setup-supabase.mjs OR paste into Supabase SQL Editor.
-- Idempotent: safe to re-run.
-- =============================================================================

-- Add user_id column linking voter to Supabase Auth users.
alter table public.voters
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Add is_admin flag for admin dashboard access.
alter table public.voters
  add column if not exists is_admin boolean not null default false;

-- Make phone optional — replaced by password (managed by Supabase Auth).
alter table public.voters
  alter column phone drop not null;

-- One voter row per auth user. Allows null for legacy voters with no auth account.
create unique index if not exists voters_user_id_unique
  on public.voters (user_id)
  where user_id is not null;

-- Index for the admin dashboard filter.
create index if not exists voters_is_admin_idx on public.voters (is_admin);

-- Pre-mark the seeded admin email so the FIRST time someone signs up with
-- this email, they're already flagged as admin. (For voters that don't
-- exist yet, we use a trigger below to auto-promote on signup.)
update public.voters
  set is_admin = true
  where email = 'cafe@siamesecat.cafe';

-- Auto-promote function: when a new auth.users row is created, if their
-- email is in the admin list, set is_admin=true on the matching voter row.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- Link any existing voter row by email to this new auth user.
  update public.voters
    set user_id = new.id
    where email = new.email and user_id is null;

  -- Auto-promote known admin emails.
  if new.email = 'cafe@siamesecat.cafe' then
    update public.voters set is_admin = true where email = new.email;
  end if;

  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Allow admins to manage every table (we keep the existing anon-permissive
-- policies in place too, but admin auth opens up server-side privileged
-- operations through the service-role client).
-- Future hardening: replace the "anon ..." policies with auth.uid()-scoped
-- ones, plus dedicated admin policies. Not blocking for Phase 4.
