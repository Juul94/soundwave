-- Song requests from members; only admins can read all of them and mark them done.
create table public.song_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  moods text[] not null default '{}' check (cardinality(moods) <= 20),
  voice text not null default 'any' check (voice in ('male', 'female', 'duet', 'any')),
  style_notes text check (char_length(style_notes) <= 500),
  lyrics text check (char_length(lyrics) <= 10000),
  description text check (char_length(description) <= 3000),
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now(),
  -- Either their own lyrics or a description to write lyrics from.
  check (btrim(coalesce(lyrics, '')) <> '' or btrim(coalesce(description, '')) <> '')
);
create index song_requests_created_idx on public.song_requests(created_at desc);

alter table public.song_requests enable row level security;

create policy requests_insert_own on public.song_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'new' and public.is_active_member());
create policy requests_select on public.song_requests for select to authenticated
  using ((user_id = auth.uid() and public.is_active_member()) or public.is_admin());
create policy requests_admin_update on public.song_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy requests_admin_delete on public.song_requests for delete to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.song_requests to authenticated;
grant all on public.song_requests to service_role;
