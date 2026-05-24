-- One-off: ensure the seeded admin email is promoted, even if the voter
-- row was created before the signup action was admin-aware.
update public.voters
  set is_admin = true
  where email = 'cafe@siamesecat.cafe';
