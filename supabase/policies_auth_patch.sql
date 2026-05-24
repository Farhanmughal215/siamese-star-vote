-- One-off patch: extend every public-table RLS policy to also apply to the
-- `authenticated` role. Without this, signed-in users (who use the
-- authenticated role, not anon) get RLS-denied on every query.

drop policy if exists "anon can read cats" on public.cats;
create policy "anon can read cats" on public.cats
  for select to anon, authenticated using (true);

drop policy if exists "anon can read app_settings" on public.app_settings;
create policy "anon can read app_settings" on public.app_settings
  for select to anon, authenticated using (true);

drop policy if exists "anon can read invitation_codes" on public.invitation_codes;
create policy "anon can read invitation_codes" on public.invitation_codes
  for select to anon, authenticated using (true);

drop policy if exists "anon can update invitation_codes" on public.invitation_codes;
create policy "anon can update invitation_codes" on public.invitation_codes
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "anon can insert voters" on public.voters;
create policy "anon can insert voters" on public.voters
  for insert to anon, authenticated with check (true);

drop policy if exists "anon can read voters" on public.voters;
create policy "anon can read voters" on public.voters
  for select to anon, authenticated using (true);

drop policy if exists "anon can update voters" on public.voters;
create policy "anon can update voters" on public.voters
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "anon can manage own hearts" on public.hearts;
create policy "anon can manage own hearts" on public.hearts
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "anon can manage own cat_affection" on public.cat_affection;
create policy "anon can manage own cat_affection" on public.cat_affection
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "anon can manage own wheel_spins" on public.wheel_spins;
create policy "anon can manage own wheel_spins" on public.wheel_spins
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "anon can manage own coupons" on public.coupons;
create policy "anon can manage own coupons" on public.coupons
  for all to anon, authenticated using (true) with check (true);
