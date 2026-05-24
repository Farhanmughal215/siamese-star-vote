-- =============================================================================
-- Siamese Star Vote — Phase 3B RLS policies
-- =============================================================================
-- Run AFTER the initial migration (20260523000000_initial_schema.sql) and
-- AFTER the seed (seed.sql).
--
-- These policies are deliberately PERMISSIVE for the anon role because the
-- frontend doesn't have authentication yet — every voter speaks to Supabase
-- with the same anon key, scoped only by their `voter_id`.
--
-- ⚠  This is appropriate for a Phase 3B PROTOTYPE on a non-production
-- ⚠  Supabase project. Before going to production, replace these with
-- ⚠  policies that require auth.uid() = voter_id (Phase 3C).
--
-- Apply via the SQL Editor:
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this whole file → Run
-- =============================================================================

-- ---- Public READS ----------------------------------------------------------
-- Cats roster and runtime settings are intentionally public — the homepage
-- needs them before the user even has a profile.

create policy if not exists "anon can read cats"
  on public.cats
  for select
  to anon
  using (true);

create policy if not exists "anon can read app_settings"
  on public.app_settings
  for select
  to anon
  using (true);

-- ---- Invitation codes ------------------------------------------------------
-- Anyone (anon) can read them so the VoterDetailsModal can validate input.
-- Updates (e.g. usage_count bump) also allowed for now because we don't
-- have a server-side incrementer yet.

create policy if not exists "anon can read invitation_codes"
  on public.invitation_codes
  for select
  to anon
  using (true);

create policy if not exists "anon can update invitation_codes"
  on public.invitation_codes
  for update
  to anon
  using (true)
  with check (true);

-- ---- Voters ----------------------------------------------------------------
-- Anon insert/select/update because there's no auth yet. In Phase 3C this
-- becomes "voter row matches auth.uid()".

create policy if not exists "anon can insert voters"
  on public.voters
  for insert
  to anon
  with check (true);

create policy if not exists "anon can read voters"
  on public.voters
  for select
  to anon
  using (true);

create policy if not exists "anon can update voters"
  on public.voters
  for update
  to anon
  using (true)
  with check (true);

-- ---- Hearts ----------------------------------------------------------------
-- The 5-hour cooldown is enforced CLIENT-SIDE in Phase 3B. A malicious
-- client could bypass it; that's acceptable for the prototype. Phase 3C
-- will move the check into a Postgres function + partial unique index.

create policy if not exists "anon can manage own hearts"
  on public.hearts
  for all
  to anon
  using (true)
  with check (true);

-- ---- Cat affection ---------------------------------------------------------

create policy if not exists "anon can manage own cat_affection"
  on public.cat_affection
  for all
  to anon
  using (true)
  with check (true);

-- ---- Wheel spins -----------------------------------------------------------

create policy if not exists "anon can manage own wheel_spins"
  on public.wheel_spins
  for all
  to anon
  using (true)
  with check (true);

-- ---- Coupons ---------------------------------------------------------------

create policy if not exists "anon can manage own coupons"
  on public.coupons
  for all
  to anon
  using (true)
  with check (true);

-- =============================================================================
-- Verifying
-- =============================================================================
-- After running this, all eight tables should have non-empty rowsecurity
-- policies. Confirm with:
--
--   select tablename, policyname, roles
--   from pg_policies
--   where schemaname = 'public'
--   order by tablename, policyname;
--
-- The frontend should now succeed at:
--   - SELECT on cats / app_settings / invitation_codes
--   - INSERT/SELECT on voters
--   - INSERT/SELECT on hearts (and DELETE for the undo path)
--   - UPSERT on cat_affection
--   - INSERT on wheel_spins / coupons
-- =============================================================================
