-- Last time a member opened the installed app (PWA), shown in Admin > Users
alter table public.profiles add column if not exists last_seen_app timestamptz;

create or replace function public.touch_app_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set last_seen_app = now() where id = auth.uid();
$$;

revoke all on function public.touch_app_seen() from public, anon;
grant execute on function public.touch_app_seen() to authenticated;
