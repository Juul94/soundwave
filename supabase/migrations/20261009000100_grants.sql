-- Explicit Data API grants (RLS still enforces row access for authenticated).
grant usage on schema public to authenticated, service_role;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.genres to authenticated;
grant select, insert, update, delete on public.songs to authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.recently_played to authenticated;

grant all on all tables in schema public to service_role;
