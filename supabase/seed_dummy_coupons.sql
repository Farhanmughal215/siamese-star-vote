-- Insert 4 dummy coupons against the most recent voter + 4 different cats.
-- Mix of statuses + expiry dates so /admin/coupons has realistic data to
-- exercise the tabs (active / redeemed / expired).
--
-- ON CONFLICT (coupon_code) is a safe no-op so re-running is idempotent.

insert into public.coupons
  (voter_id, cat_id, coupon_code, reward_title, status, issued_at, expires_at, redeemed_at)
select
  (select id from public.voters order by created_at desc limit 1) as voter_id,
  c.id as cat_id,
  x.code,
  x.reward,
  x.status::text,
  x.issued_at,
  x.expires_at,
  x.redeemed_at
from public.cats c
join (values
  ('lucy',    'MEOW-2001', 'Free hot chocolate',            'active',   now() - interval '2 hours',  now() + interval '5 days',  null),
  ('charlie', 'PURR-3142', '20% off your next visit',       'active',   now() - interval '1 day',    now() + interval '6 days',  null),
  ('feli',    'PAWS-7788', 'Free catnip toy',               'redeemed', now() - interval '3 days',   now() + interval '4 days',  now() - interval '12 hours'),
  ('mia',     'KITN-4242', 'Cat cafe sticker pack',         'expired',  now() - interval '14 days',  now() - interval '2 days',  null)
) as x(slug, code, reward, status, issued_at, expires_at, redeemed_at)
  on c.slug = x.slug
where exists (select 1 from public.voters)
on conflict (coupon_code) do nothing;

-- Show what we have now per status.
select status, count(*) as n from public.coupons group by status order by status;
