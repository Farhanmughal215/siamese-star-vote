select count(*) as seasons from public.voting_seasons;
select id, name, status, starts_at, ends_at from public.voting_seasons order by created_at desc limit 5;
select count(*) as cats_total, count(*) filter (where is_active) as cats_active from public.cats;
select count(*) as rewards from public.wheel_rewards where is_active = true;
