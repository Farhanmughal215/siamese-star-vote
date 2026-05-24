select
  count(*) filter (where true) as total,
  count(*) filter (where is_active) as active,
  count(*) filter (where not is_active) as inactive
from public.cats;

select slug, name, is_active from public.cats order by created_at;
