-- One-off patch: ensure service_role has full access to all public tables.
-- Required after Management-API-created tables (which don't auto-grant).

grant usage on schema public to service_role;

grant select, insert, update, delete on public.cats to service_role;
grant select, insert, update, delete on public.app_settings to service_role;
grant select, insert, update, delete on public.invitation_codes to service_role;
grant select, insert, update, delete on public.voters to service_role;
grant select, insert, update, delete on public.hearts to service_role;
grant select, insert, update, delete on public.cat_affection to service_role;
grant select, insert, update, delete on public.wheel_spins to service_role;
grant select, insert, update, delete on public.coupons to service_role;

grant select on public.hearts_view to service_role;
grant select on public.affection_view to service_role;
grant select on public.wheel_spins_view to service_role;
grant select on public.coupons_view to service_role;

alter default privileges in schema public grant all on tables to service_role;
