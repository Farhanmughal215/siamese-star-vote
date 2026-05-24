-- =============================================================================
-- Siamese Star Vote - ALL-IN-ONE installer
-- =============================================================================
-- Paste into Supabase SQL Editor (+ New tab) and click Run.
-- Idempotent: safe to run multiple times.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------- TABLES ----------

create table if not exists public.voters (
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

create table if not exists public.cats (
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

create table if not exists public.coupons (
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

create table if not exists public.hearts (
  id                  uuid          primary key default gen_random_uuid(),
  voter_id            uuid          not null references public.voters(id) on delete cascade,
  cat_id              uuid          not null references public.cats(id) on delete cascade,
  device_id           text          not null,
  hearted_at          timestamptz   not null default now(),
  next_available_at   timestamptz   not null,
  created_at          timestamptz   not null default now()
);

create table if not exists public.cat_affection (
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

create table if not exists public.wheel_spins (
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

create table if not exists public.invitation_codes (
  id           uuid          primary key default gen_random_uuid(),
  code         text          not null,
  label        text,
  is_active    boolean       not null default true,
  usage_count  integer       not null default 0,
  created_at   timestamptz   not null default now(),
  constraint invitation_codes_code_unique unique (code),
  constraint invitation_codes_usage_nonneg check (usage_count >= 0)
);

create table if not exists public.app_settings (
  id             uuid          primary key default gen_random_uuid(),
  setting_key    text          not null,
  setting_value  text          not null,
  updated_at     timestamptz   not null default now(),
  constraint app_settings_setting_key_unique unique (setting_key)
);

-- ---------- INDEXES ----------

create index if not exists voters_device_id_idx on public.voters (device_id);
create index if not exists voters_invitation_code_idx on public.voters (invitation_code);
create index if not exists cats_is_active_idx on public.cats (is_active);
create index if not exists hearts_voter_id_idx on public.hearts (voter_id);
create index if not exists hearts_cat_id_idx on public.hearts (cat_id);
create index if not exists hearts_voter_cat_idx on public.hearts (voter_id, cat_id);
create index if not exists hearts_active_cooldown_idx on public.hearts (voter_id, cat_id, next_available_at);
create index if not exists cat_affection_voter_id_idx on public.cat_affection (voter_id);
create index if not exists cat_affection_cat_id_idx on public.cat_affection (cat_id);
create index if not exists wheel_spins_voter_id_idx on public.wheel_spins (voter_id);
create index if not exists wheel_spins_cat_id_idx on public.wheel_spins (cat_id);
create index if not exists coupons_voter_id_idx on public.coupons (voter_id);
create index if not exists coupons_status_idx on public.coupons (status);
create index if not exists coupons_expires_at_idx on public.coupons (expires_at);
create index if not exists invitation_codes_is_active_idx on public.invitation_codes (is_active);

-- ---------- updated_at TRIGGER ----------
-- The function body uses a tagged dollar-quote ($fn$...$fn$) so it cannot
-- accidentally match any string in the seed section below.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

drop trigger if exists voters_set_updated_at on public.voters;
create trigger voters_set_updated_at
  before update on public.voters
  for each row execute function public.set_updated_at();

drop trigger if exists cat_affection_set_updated_at on public.cat_affection;
create trigger cat_affection_set_updated_at
  before update on public.cat_affection
  for each row execute function public.set_updated_at();

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------

alter table public.voters          enable row level security;
alter table public.cats            enable row level security;
alter table public.hearts          enable row level security;
alter table public.cat_affection   enable row level security;
alter table public.wheel_spins     enable row level security;
alter table public.coupons         enable row level security;
alter table public.invitation_codes enable row level security;
alter table public.app_settings    enable row level security;

-- ---------- POLICIES (prototype only - anon-permissive) ----------

drop policy if exists "anon can read cats" on public.cats;
create policy "anon can read cats" on public.cats for select to anon, authenticated using (true);

drop policy if exists "anon can read app_settings" on public.app_settings;
create policy "anon can read app_settings" on public.app_settings for select to anon, authenticated using (true);

drop policy if exists "anon can read invitation_codes" on public.invitation_codes;
create policy "anon can read invitation_codes" on public.invitation_codes for select to anon, authenticated using (true);

drop policy if exists "anon can update invitation_codes" on public.invitation_codes;
create policy "anon can update invitation_codes" on public.invitation_codes for update to anon, authenticated using (true) with check (true);

drop policy if exists "anon can insert voters" on public.voters;
create policy "anon can insert voters" on public.voters for insert to anon, authenticated with check (true);

drop policy if exists "anon can read voters" on public.voters;
create policy "anon can read voters" on public.voters for select to anon, authenticated using (true);

drop policy if exists "anon can update voters" on public.voters;
create policy "anon can update voters" on public.voters for update to anon, authenticated using (true) with check (true);

drop policy if exists "anon can manage own hearts" on public.hearts;
create policy "anon can manage own hearts" on public.hearts for all to anon, authenticated using (true) with check (true);

drop policy if exists "anon can manage own cat_affection" on public.cat_affection;
create policy "anon can manage own cat_affection" on public.cat_affection for all to anon, authenticated using (true) with check (true);

drop policy if exists "anon can manage own wheel_spins" on public.wheel_spins;
create policy "anon can manage own wheel_spins" on public.wheel_spins for all to anon, authenticated using (true) with check (true);

drop policy if exists "anon can manage own coupons" on public.coupons;
create policy "anon can manage own coupons" on public.coupons for all to anon, authenticated using (true) with check (true);

-- ---------- TABLE-LEVEL GRANTS (required by Postgres BEFORE RLS even runs) ----------
-- Without these, the anon role gets 401 "permission denied for table cats"
-- regardless of RLS policies. Supabase auto-grants when you create tables
-- through the Dashboard UI - but NOT when you create them via the
-- Management API. So we set them explicitly.

grant usage on schema public to anon, authenticated, service_role;

grant select on public.cats to anon, authenticated, service_role;
grant select on public.app_settings to anon, authenticated, service_role;
grant select, update on public.invitation_codes to anon, authenticated, service_role;
grant select, insert, update, delete on public.voters to anon, authenticated, service_role;
grant select, insert, update, delete on public.hearts to anon, authenticated, service_role;
grant select, insert, update, delete on public.cat_affection to anon, authenticated, service_role;
grant select, insert, update, delete on public.wheel_spins to anon, authenticated, service_role;
grant select, insert, update, delete on public.coupons to anon, authenticated, service_role;

-- Future objects in public schema get the same default privileges.
alter default privileges in schema public grant select on tables to anon, authenticated, service_role;

-- ---------- SEED: app_settings ----------

insert into public.app_settings (setting_key, setting_value) values
  ('heart_cooldown_hours', '5'),
  ('coupon_expiry_days', '7'),
  ('wheel_win_rate', '20')
on conflict (setting_key) do nothing;

------------ SEED: invitation_codes ----------

insert into public.invitation_codes (code, label, is_active) values
  ('SIAMESE-2026', 'Default launch code', true),
  ('CAT-CAFE', 'Cafe walk-in code', true),
  ('STAR-VOTE', 'Press / influencer code', true),
  ('TEST-LOCAL', 'Local development testing', true)
on conflict (code) do nothing;

-- ---------- SEED: 16 cats ----------
-- Descriptions rewritten to avoid apostrophes entirely. No string escaping
-- gymnastics needed - what the editor highlights is what runs.

insert into public.cats (slug, name, title, personality, description, image_url, story_url) values
  ('lucy', 'Lucy', 'The Angel Boy', 'Sweet & Gentle',
   'A halo-soft soul who greets every visitor with quiet eyes and a slow blink. Lucy curls into laps like he was made for them.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/1.png',
   'https://siamesecatcafe.example.com/cats/lucy'),
  ('charlie', 'Charlie', 'The Comedian King', 'Funny & Playful',
   'The resident jester of the cafe. Charlie will absolutely steal your hair tie, your pen, and your heart - in that order.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/2.png',
   'https://siamesecatcafe.example.com/cats/charlie'),
  ('feli', 'Feli', 'The Shy Princess', 'Calm & Elegant',
   'Watchful and refined, Feli observes the world from her velvet cushion and only graces the brave with her purr.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/3.png',
   'https://siamesecatcafe.example.com/cats/feli'),
  ('cleo', 'Cleo', 'The First Lady', 'Graceful & Smart',
   'Composed, regal, impossibly poised. Cleo runs the social hour at the cafe with the grace of a seasoned diplomat.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/1.png',
   'https://siamesecatcafe.example.com/cats/cleo'),
  ('siam', 'Siam', 'The Curious Explorer', 'Brave & Adventurous',
   'If there is a shelf, Siam has climbed it. If there is a box, Siam has investigated it twice. Born to chart new territory.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/2.png',
   'https://siamesecatcafe.example.com/cats/siam'),
  ('muezza', 'Muezza', 'The Little Star', 'Cute & Mischievous',
   'A pocket-sized sparkle of trouble. Muezza was born to be photographed and absolutely knows it.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/3.png',
   'https://siamesecatcafe.example.com/cats/muezza'),
  ('comet', 'Comet', 'The Softie', 'Loves Cuddles',
   'A cloud with whiskers. The Comet superpower is melting straight into your arms within four seconds flat.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/1.png',
   'https://siamesecatcafe.example.com/cats/comet'),
  ('malee', 'Malee', 'The Talkative', 'Loves Attention',
   'Malee has a lot to say and absolutely will say it. Bring snacks, bring patience, bring an audience.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/2.png',
   'https://siamesecatcafe.example.com/cats/malee'),
  ('lila', 'Lila', 'The Independent', 'Confident & Cool',
   'Lila walks alone by choice, not by chance. Earn her trust and you have earned a quiet, unshakable friend.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/3.png',
   'https://siamesecatcafe.example.com/cats/lila'),
  ('luca', 'Luca', 'The Brave Heart', 'Strong & Loyal',
   'Guardian of the front window. Luca was rescued from the street and has been protecting his family ever since.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/1.png',
   'https://siamesecatcafe.example.com/cats/luca'),
  ('pho', 'Pho', 'The Sweetheart', 'Kind & Gentle',
   'Pho greets every cat and every human with the same patient warmth. The quiet healer of the cafe.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/2.png',
   'https://siamesecatcafe.example.com/cats/pho'),
  ('mia', 'Mia', 'The Foodie', 'Always Hungry',
   'Mia has a sixth sense for treat jars. Approach with snacks and prepare for full-court diplomatic negotiation.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/3.png',
   'https://siamesecatcafe.example.com/cats/mia'),
  ('nina', 'Nina', 'The Dancer', 'Playful & Energetic',
   'Spins, leaps, twirls. Nina turns every laser-pointer game into a one-cat ballet.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/1.png',
   'https://siamesecatcafe.example.com/cats/nina'),
  ('mira', 'Mira', 'The Dreamer', 'Calm & Thoughtful',
   'Mira spends her afternoons watching the rain. A quiet philosopher with very strong opinions about sunbeams.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/2.png',
   'https://siamesecatcafe.example.com/cats/mira'),
  ('flow', 'Flow', 'The Queen', 'Elegant & Regal',
   'Flow holds court from the highest shelf. Subjects may approach if invited, and only if their hands are clean.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/3.png',
   'https://siamesecatcafe.example.com/cats/flow'),
  ('soul', 'Soul', 'The Protector', 'Strong & Caring',
   'Soul keeps watch over the youngest kittens. Big heart, bigger paws, biggest sense of duty.',
   'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/1.png',
   'https://siamesecatcafe.example.com/cats/soul')
on conflict (slug) do nothing;

-- ---------- FRIENDLY VIEWS ----------
-- Auto-join cat name + voter name so the Supabase Table Editor shows
-- readable data instead of raw UUIDs. Browse under "Views" tab.
-- Views are read-only and inherit RLS from the underlying tables.

create or replace view public.hearts_view as
select
  h.id,
  v.name as voter_name,
  v.email as voter_email,
  c.name as cat_name,
  c.slug as cat_slug,
  h.hearted_at,
  h.next_available_at,
  h.device_id,
  h.voter_id,
  h.cat_id
from public.hearts h
join public.voters v on v.id = h.voter_id
join public.cats c on c.id = h.cat_id
order by h.hearted_at desc;

create or replace view public.affection_view as
select
  a.id,
  v.name as voter_name,
  v.email as voter_email,
  c.name as cat_name,
  c.slug as cat_slug,
  a.hearts_given,
  a.affection_level,
  a.last_hearted_at,
  a.voter_id,
  a.cat_id
from public.cat_affection a
join public.voters v on v.id = a.voter_id
join public.cats c on c.id = a.cat_id
order by a.hearts_given desc;

create or replace view public.wheel_spins_view as
select
  ws.id,
  v.name as voter_name,
  v.email as voter_email,
  c.name as cat_name,
  ws.result_type,
  ws.reward_title,
  cp.coupon_code,
  ws.spun_at,
  ws.voter_id,
  ws.cat_id,
  ws.heart_id,
  ws.coupon_id
from public.wheel_spins ws
join public.voters v on v.id = ws.voter_id
join public.cats c on c.id = ws.cat_id
left join public.coupons cp on cp.id = ws.coupon_id
order by ws.spun_at desc;

create or replace view public.coupons_view as
select
  cp.id,
  cp.coupon_code,
  v.name as voter_name,
  v.email as voter_email,
  c.name as cat_name,
  cp.reward_title,
  cp.status,
  cp.issued_at,
  cp.expires_at,
  cp.redeemed_at,
  cp.voter_id,
  cp.cat_id
from public.coupons cp
join public.voters v on v.id = cp.voter_id
join public.cats c on c.id = cp.cat_id
order by cp.issued_at desc;

-- ---------- GRANT SELECT on the friendly views ----------

grant select on public.hearts_view to anon, authenticated, service_role;
grant select on public.affection_view to anon, authenticated, service_role;
grant select on public.wheel_spins_view to anon, authenticated, service_role;
grant select on public.coupons_view to anon, authenticated, service_role;
