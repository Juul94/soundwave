-- Soundwave: total play count per song (a play counts after 30 s of listening)
alter table public.songs add column if not exists plays integer not null default 0;

-- Don't bump updated_at when only the play count changes
drop trigger if exists songs_updated on public.songs;
create trigger songs_updated before update on public.songs
  for each row when (old.plays is not distinct from new.plays)
  execute function public.set_updated_at();

create or replace function public.count_play(p_song uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_member() then return; end if;
  update public.songs set plays = plays + 1 where id = p_song;
end $$;
revoke all on function public.count_play(uuid) from public, anon;
grant execute on function public.count_play(uuid) to authenticated;

-- Start from existing history: one play per person who has played each song
update public.songs s set plays = coalesce(
  (select count(*) from public.recently_played r where r.song_id = s.id), 0)
where s.plays = 0;
