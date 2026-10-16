export type Role = "admin" | "user";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  last_seen_app: string | null;
};

export type Genre = { id: string; name: string; slug: string; created_at: string };

export type Song = {
  id: string;
  title: string;
  genre_id: string;
  artist: string | null;
  album: string | null;
  description: string | null;
  mood_tags: string[];
  audio_storage_path: string;
  cover_storage_path: string | null;
  duration_seconds: number | null;
  release_date: string | null;
  is_explicit: boolean;
  file_hash: string | null;
  plays: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  genres?: { name: string; slug: string } | null;
};

/** Song enriched with a short-lived signed cover URL. */
export type SongView = Song & { cover_url: string | null; cover_thumb: string | null };

export const SONG_SELECT = "*, genres(name, slug)";
