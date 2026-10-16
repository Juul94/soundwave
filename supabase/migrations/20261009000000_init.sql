-- Soundwave initial schema, RLS and storage policies.

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'user' check (role in ('admin','user')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Security-definer helpers (avoid recursive RLS on profiles)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'admin' and is_active);
$$;

create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and is_active);
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_active_member() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_member() to authenticated;

-- New auth user -> profile (always role 'user'; promotion is a separate admin action)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block role/status/identity changes unless performed by an admin or the service role
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare remaining int;
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.id is distinct from old.id
       or new.email is distinct from old.email then
      raise exception 'Not allowed to change role, status or identity';
    end if;
  end if;
  -- never lose the last active admin
  if old.role = 'admin' and old.is_active and (new.role <> 'admin' or not new.is_active) then
    select count(*) into remaining from public.profiles
      where role = 'admin' and is_active and id <> old.id;
    if remaining = 0 then raise exception 'Cannot demote or disable the last administrator'; end if;
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_profile_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and old.is_active and not exists
     (select 1 from public.profiles where role='admin' and is_active and id <> old.id) then
    raise exception 'Cannot delete the last administrator';
  end if;
  return old;
end $$;

create trigger profiles_guard_delete before delete on public.profiles
  for each row execute function public.guard_profile_delete();

-- ---------- genres ----------
create table public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- songs ----------
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  genre_id uuid not null references public.genres(id) on delete restrict,
  artist text,
  album text,
  description text,
  mood_tags text[] not null default '{}',
  audio_storage_path text not null,
  cover_storage_path text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  release_date date,
  is_explicit boolean not null default false,
  file_hash text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index songs_genre_idx on public.songs(genre_id);
create index songs_created_idx on public.songs(created_at desc);
create index songs_file_hash_idx on public.songs(file_hash) where file_hash is not null;
create index songs_search_idx on public.songs using gin (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(artist,'') || ' ' || coalesce(album,'')));
create trigger songs_updated before update on public.songs
  for each row execute function public.set_updated_at();

-- ---------- favorites ----------
create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);
create index favorites_song_idx on public.favorites(song_id);

-- ---------- recently_played (one row per user+song, upserted) ----------
create table public.recently_played (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  played_at timestamptz not null default now(),
  unique (user_id, song_id)
);
create index recently_played_user_idx on public.recently_played(user_id, played_at desc);

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.genres enable row level security;
alter table public.songs enable row level security;
alter table public.favorites enable row level security;
alter table public.recently_played enable row level security;

-- profiles: own row or admin; users may only edit display_name (trigger blocks the rest)
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- no insert/delete policies: handled by trigger / service role

-- genres
create policy genres_select on public.genres for select to authenticated
  using (public.is_active_member());
create policy genres_admin_write on public.genres for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- songs
create policy songs_select on public.songs for select to authenticated
  using (public.is_active_member());
create policy songs_admin_write on public.songs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- favorites
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid() and public.is_active_member())
  with check (user_id = auth.uid() and public.is_active_member());

-- recently_played
create policy recent_own on public.recently_played for all to authenticated
  using (user_id = auth.uid() and public.is_active_member())
  with check (user_id = auth.uid() and public.is_active_member());

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('audio',  'audio',  false, 52428800, array['audio/mpeg','audio/mp3']),
  ('covers', 'covers', false, 5242880,  array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "members read audio" on storage.objects for select to authenticated
  using (bucket_id in ('audio','covers') and public.is_active_member());
create policy "admins insert media" on storage.objects for insert to authenticated
  with check (bucket_id in ('audio','covers') and public.is_admin());
create policy "admins update media" on storage.objects for update to authenticated
  using (bucket_id in ('audio','covers') and public.is_admin())
  with check (bucket_id in ('audio','covers') and public.is_admin());
create policy "admins delete media" on storage.objects for delete to authenticated
  using (bucket_id in ('audio','covers') and public.is_admin());

-- ---------- seed genres ----------
insert into public.genres (name, slug) values
  ('Pop','pop'),('Rock','rock'),('Hip-Hop','hip-hop'),('Electronic','electronic'),
  ('Lo-fi','lo-fi'),('Jazz','jazz'),('Country','country'),('Classical','classical'),
  ('R&B','r-b'),('Metal','metal'),('Folk','folk'),('Other','other')
on conflict do nothing;
