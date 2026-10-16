-- Personal playlists: a title per playlist plus song references (no audio is copied).
create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create index playlists_user_idx on public.playlists(user_id, created_at desc);

create table public.playlist_songs (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (playlist_id, song_id)
);
create index playlist_songs_song_idx on public.playlist_songs(song_id);

alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;

create policy playlists_own on public.playlists for all to authenticated
  using (user_id = auth.uid() and public.is_active_member())
  with check (user_id = auth.uid() and public.is_active_member());

create policy playlist_songs_own on public.playlist_songs for all to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()) and public.is_active_member())
  with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()) and public.is_active_member());

grant select, insert, update, delete on public.playlists to authenticated;
grant select, insert, update, delete on public.playlist_songs to authenticated;
grant all on public.playlists, public.playlist_songs to service_role;
