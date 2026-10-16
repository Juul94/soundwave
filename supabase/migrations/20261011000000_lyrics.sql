-- Lyrics live in their own table so song lists don't download them.
-- Stored as plain text, or LRC ("[mm:ss.xx]line") once synced in the admin panel.
create table public.song_lyrics (
  song_id uuid primary key references public.songs(id) on delete cascade,
  lyrics text not null,
  updated_at timestamptz not null default now()
);

create trigger song_lyrics_updated_at before update on public.song_lyrics
  for each row execute function public.set_updated_at();

alter table public.song_lyrics enable row level security;

create policy lyrics_select on public.song_lyrics for select to authenticated
  using (public.is_active_member());
create policy lyrics_admin_write on public.song_lyrics for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.song_lyrics to authenticated;
grant all on public.song_lyrics to service_role;
