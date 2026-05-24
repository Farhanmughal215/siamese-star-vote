-- =============================================================================
-- Siamese Star Vote — Initial schema (Phase 3A: Backend foundation)
-- =============================================================================
-- This migration creates the persistent storage layer that the frontend's
-- localStorage shelves will eventually swap onto. The frontend is NOT wired
-- to these tables yet — that happens in Phase 3B. For now, this migration
-- only sets up the structure + RLS scaffolding.
--
-- Apply via Supabase CLI:    supabase db reset
-- Or paste into:             SQL Editor in the Supabase Dashboard
-- =============================================================================

-- pgcrypto powers gen_random_uuid(). Available on every Supabase project but
-- enabling explicitly makes this migration portable to bare Postgres.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. voters
-- ---------------------------------------------------------------------------
-- One row per visitor who submitted the entry form. Email is unique across
-- the table — the same person re-entering on a different device should
-- merge to the same voter row. `device_id` is the FIRST device this voter
-- registered from; per-device tracking happens through joins to `hearts`.
-- ---------------------------------------------------------------------------
create table public.voters (
  id               uuid          primary key default gen_random_uuid(),
  name             text          not null,
  email            text          not null,
  phone            text          not null,
  invitation_code  text          not null,
  device_id        text          not null,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),

  constraint voters_email_unique unique (email)
);

create index voters_device_id_idx on public.voters (device_id);
create index voters_invitation_code_idx on public.voters (invitation_code);

comment on table public.voters is
  'Visitors who have submitted the entry form. Mirrors localStorage.voterProfile.';

-- ---------------------------------------------------------------------------
-- 2. cats
-- ---------------------------------------------------------------------------
-- The 16 mayoral candidates. Seeded from `data/cats.ts` (see seed.sql).
-- `is_active = false` hides a cat without deleting their hearts/affection
-- history. `slug` is the human-readable identifier used in URLs.
-- ---------------------------------------------------------------------------
create table public.cats (
  id           uuid          primary key default gen_random_uuid(),
  slug         text          not null,
  name         text          not null,
  title        text          not null,
  personality  text          not null,
  description  text          not null,
  image_url    text          not null,
  story_url    text,
  is_active    boolean       not null default true,
  created_at   timestamptz   not null default now(),

  constraint cats_slug_unique unique (slug)
);

create index cats_is_active_idx on public.cats (is_active);

comment on table public.cats is
  'The candidate cats. Currently seeded from data/cats.ts; frontend keeps reading from that file until Phase 3B wires this table in.';

-- ---------------------------------------------------------------------------
-- 3. hearts
-- ---------------------------------------------------------------------------
-- One row per heart ever given. Doubles as:
--   * Permanent vote history (no row is deleted on cooldown expiry — only
--     on the 15-minute undo path)
--   * Live cooldown lookup: a heart is "active" when next_available_at > now()
-- This unifies what the localStorage version split into `voteHistory` +
-- `heartedCats`.
-- ---------------------------------------------------------------------------
create table public.hearts (
  id                  uuid          primary key default gen_random_uuid(),
  voter_id            uuid          not null references public.voters(id) on delete cascade,
  cat_id              uuid          not null references public.cats(id) on delete cascade,
  device_id           text          not null,
  hearted_at          timestamptz   not null default now(),
  next_available_at   timestamptz   not null,
  created_at          timestamptz   not null default now()
);

create index hearts_voter_id_idx on public.hearts (voter_id);
create index hearts_cat_id_idx on public.hearts (cat_id);
create index hearts_voter_cat_idx on public.hearts (voter_id, cat_id);
-- Fast "is this voter currently on cooldown for this cat?" lookup.
create index hearts_active_cooldown_idx
  on public.hearts (voter_id, cat_id, next_available_at);

comment on table public.hearts is
  'Every heart ever given. Acts as both permanent history and the per-cat 5-hour cooldown source (a row is "on cooldown" while next_available_at > now()).';

-- ---------------------------------------------------------------------------
-- 4. cat_affection
-- ---------------------------------------------------------------------------
-- Long-term relationship layer. One row per (voter, cat) pair; hearts_given
-- accumulates across all hearts ever given to that cat by that voter.
-- affection_level is derived from hearts_given (1/3/7/15/30 thresholds).
-- ---------------------------------------------------------------------------
create table public.cat_affection (
  id               uuid          primary key default gen_random_uuid(),
  voter_id         uuid          not null references public.voters(id) on delete cascade,
  cat_id           uuid          not null references public.cats(id) on delete cascade,
  hearts_given     integer       not null default 0,
  affection_level  integer       not null default 0,
  last_hearted_at  timestamptz,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),

  constraint cat_affection_voter_cat_unique unique (voter_id, cat_id),
  constraint cat_affection_hearts_nonneg check (hearts_given >= 0),
  constraint cat_affection_level_range check (affection_level between 0 and 5)
);

create index cat_affection_voter_id_idx on public.cat_affection (voter_id);
create index cat_affection_cat_id_idx on public.cat_affection (cat_id);

comment on table public.cat_affection is
  'Per-voter, per-cat heart accumulator + derived affection level (0-5).';

-- ---------------------------------------------------------------------------
-- 5. coupons
-- ---------------------------------------------------------------------------
-- (Defined before wheel_spins because wheel_spins.coupon_id FKs to this.)
-- Café redeemable coupons issued by winning wheel spins. `coupon_code` is
-- shown to staff for verification. `status` transitions:
--   active   → redeemed   (manual or automated redemption)
--   active   → expired    (background job after expires_at passes)
-- ---------------------------------------------------------------------------
create table public.coupons (
  id            uuid          primary key default gen_random_uuid(),
  voter_id      uuid          not null references public.voters(id) on delete cascade,
  cat_id        uuid          not null references public.cats(id) on delete cascade,
  coupon_code   text          not null,
  reward_title  text          not null,
  issued_at     timestamptz   not null default now(),
  expires_at    timestamptz   not null,
  status        text          not null default 'active',
  redeemed_at   timestamptz,
  created_at    timestamptz   not null default now(),

  constraint coupons_coupon_code_unique unique (coupon_code),
  constraint coupons_status_check check (status in ('active', 'redeemed', 'expired'))
);

create index coupons_voter_id_idx on public.coupons (voter_id);
create index coupons_status_idx on public.coupons (status);
create index coupons_expires_at_idx on public.coupons (expires_at);

comment on table public.coupons is
  'Issued café reward coupons. Coupon_code is the staff-facing verification token.';

-- ---------------------------------------------------------------------------
-- 6. wheel_spins
-- ---------------------------------------------------------------------------
-- One row per Paw Fortune Wheel spin. Tied to the specific heart it
-- belonged to via `heart_id` — so undoing a heart cascades the spin.
-- `coupon_id` is null for losing spins.
-- ---------------------------------------------------------------------------
create table public.wheel_spins (
  id            uuid          primary key default gen_random_uuid(),
  voter_id      uuid          not null references public.voters(id) on delete cascade,
  cat_id        uuid          not null references public.cats(id) on delete cascade,
  heart_id      uuid          not null references public.hearts(id) on delete cascade,
  result_type   text          not null,
  reward_title  text          not null,
  coupon_id     uuid          references public.coupons(id) on delete set null,
  spun_at       timestamptz   not null default now(),

  constraint wheel_spins_result_type_check check (result_type in ('win', 'lose')),
  constraint wheel_spins_heart_unique unique (heart_id)
);

create index wheel_spins_voter_id_idx on public.wheel_spins (voter_id);
create index wheel_spins_cat_id_idx on public.wheel_spins (cat_id);

comment on table public.wheel_spins is
  'Paw Fortune Wheel results. One row per heart at most (heart_id is unique).';

-- ---------------------------------------------------------------------------
-- 7. invitation_codes
-- ---------------------------------------------------------------------------
-- Whitelist of accepted invitation codes. `usage_count` tracks how many
-- voters registered with each code; useful for marketing attribution.
-- ---------------------------------------------------------------------------
create table public.invitation_codes (
  id           uuid          primary key default gen_random_uuid(),
  code         text          not null,
  label        text,
  is_active    boolean       not null default true,
  usage_count  integer       not null default 0,
  created_at   timestamptz   not null default now(),

  constraint invitation_codes_code_unique unique (code),
  constraint invitation_codes_usage_nonneg check (usage_count >= 0)
);

create index invitation_codes_is_active_idx on public.invitation_codes (is_active);

comment on table public.invitation_codes is
  'Accepted invitation codes for entry. Phase 3B will validate VoterDetailsModal submissions against this table.';

-- ---------------------------------------------------------------------------
-- 8. app_settings
-- ---------------------------------------------------------------------------
-- Key-value store for tunable runtime configuration. Avoids redeploying
-- the frontend just to change cooldown duration or wheel win rate.
-- Values are stored as text — callers cast to int/float/json as needed.
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id             uuid          primary key default gen_random_uuid(),
  setting_key    text          not null,
  setting_value  text          not null,
  updated_at     timestamptz   not null default now(),

  constraint app_settings_setting_key_unique unique (setting_key)
);

comment on table public.app_settings is
  'Runtime-tunable configuration. Examples: heart_cooldown_hours, coupon_expiry_days, wheel_win_rate.';

-- =============================================================================
-- updated_at triggers
-- =============================================================================
-- Standard pattern: auto-update updated_at on every row mutation. Saves
-- callers from having to remember to set it.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger voters_set_updated_at
  before update on public.voters
  for each row execute function public.set_updated_at();

create trigger cat_affection_set_updated_at
  before update on public.cat_affection
  for each row execute function public.set_updated_at();

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security (scaffolding for Phase 3B)
-- =============================================================================
-- Enabling RLS without policies means default-deny — no one can read or
-- write through the anon key until we add explicit policies. That's the
-- safest starting state while the frontend is still on localStorage.
--
-- When we wire actual flows in Phase 3B, we'll add per-table policies
-- (e.g., anon can read `cats` and `app_settings`; authenticated voters can
-- only read/write their own `hearts` / `cat_affection` / `coupons`).
--
-- Commented-out templates below — uncomment + customise when ready.
-- =============================================================================

alter table public.voters          enable row level security;
alter table public.cats            enable row level security;
alter table public.hearts          enable row level security;
alter table public.cat_affection   enable row level security;
alter table public.wheel_spins     enable row level security;
alter table public.coupons         enable row level security;
alter table public.invitation_codes enable row level security;
alter table public.app_settings    enable row level security;

-- ---- Policy templates (commented — enable in Phase 3B) -------------------
-- Public read on cats (catalog is public):
--   create policy "anon can read cats"
--     on public.cats for select to anon using (true);
--
-- Public read on app_settings (so the frontend can fetch cooldown / win rate):
--   create policy "anon can read app_settings"
--     on public.app_settings for select to anon using (true);
--
-- Voter can read their own row:
--   create policy "voter reads own row"
--     on public.voters for select to authenticated
--     using (auth.uid()::text = id::text);
--
-- Voter can insert their own hearts (server-side validates cooldown):
--   create policy "voter inserts own hearts"
--     on public.hearts for insert to authenticated
--     with check (auth.uid()::text = voter_id::text);
