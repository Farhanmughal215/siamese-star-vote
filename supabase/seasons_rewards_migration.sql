-- =============================================================================
-- Voting Seasons + Wheel Rewards migration
-- Idempotent: safe to re-run.
-- =============================================================================

-- ---------- VOTING SEASONS ----------

create table if not exists public.voting_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  -- Set when the admin (or auto-archive) closes the season — the top-loved
  -- cat at that moment. NULL for open seasons.
  winner_cat_id uuid references public.cats(id),
  created_at timestamptz not null default now()
);

create index if not exists voting_seasons_status_idx on public.voting_seasons (status);
create index if not exists voting_seasons_ends_at_idx on public.voting_seasons (ends_at);

alter table public.voting_seasons enable row level security;

drop policy if exists "anyone can read seasons" on public.voting_seasons;
create policy "anyone can read seasons" on public.voting_seasons
  for select to anon, authenticated using (true);

grant select on public.voting_seasons to anon, authenticated;
grant select, insert, update, delete on public.voting_seasons to service_role;

-- Tag every heart with the season that was active when it was given. NULL
-- for legacy hearts created before this migration.
alter table public.hearts
  add column if not exists season_id uuid references public.voting_seasons(id) on delete set null;

create index if not exists hearts_season_id_idx on public.hearts (season_id);

-- ---------- WHEEL REWARDS ----------

create table if not exists public.wheel_rewards (
  id uuid primary key default gen_random_uuid(),
  -- Full descriptive label. Shown on the result modal.
  label text not null,
  -- Short label rendered on the wheel face itself.
  wheel_label text not null,
  emoji text not null,
  -- 'win' = produces a coupon; 'lose' = better luck tomorrow.
  type text not null check (type in ('win', 'lose')),
  -- Used as the coupon's reward_title when type = 'win'. NULL for lose.
  coupon_title text,
  -- Order on the wheel face. Lower = drawn earlier.
  sort_order integer not null default 0,
  -- Set false to hide a reward without losing its history.
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists wheel_rewards_active_idx on public.wheel_rewards (is_active);
create index if not exists wheel_rewards_sort_idx on public.wheel_rewards (sort_order);

alter table public.wheel_rewards enable row level security;

drop policy if exists "anyone can read wheel_rewards" on public.wheel_rewards;
create policy "anyone can read wheel_rewards" on public.wheel_rewards
  for select to anon, authenticated using (true);

grant select on public.wheel_rewards to anon, authenticated;
grant select, insert, update, delete on public.wheel_rewards to service_role;

-- ---------- SEED: 8 default rewards (mirrors data/rewards.ts) ----------

insert into public.wheel_rewards
  (label, wheel_label, emoji, type, coupon_title, sort_order, is_active) values
  ('Try Tomorrow',         'Try Tomorrow', '🐾', 'lose', null,                              0, true),
  ('5% Drink Coupon',      '5% Drink',     '☕', 'win',  '5% Off Any Drink',                1, true),
  ('Almost Lucky',         'Almost Lucky', '✨', 'lose', null,                              2, true),
  ('Free Topping',         'Free Topping', '🧁', 'win',  'Free Topping On Any Drink',       3, true),
  ('Cat Blessing',         'Cat Blessing', '💖', 'lose', null,                              4, true),
  ('10% Dessert Coupon',   '10% Dessert',  '🍰', 'win',  '10% Off Any Dessert',             5, true),
  ('Try Again Tomorrow',   'Try Again',    '🐱', 'lose', null,                              6, true),
  ('Lucky Cat Smile',      'Lucky Smile',  '😺', 'lose', null,                              7, true)
on conflict do nothing;

-- ---------- Make the existing wheel_win_rate setting live ----------
-- (No schema change; it already exists in app_settings — the public site
-- will start respecting it once we wire reward loading on /.)
insert into public.app_settings (setting_key, setting_value)
  values ('wheel_win_rate', '20')
on conflict (setting_key) do nothing;
