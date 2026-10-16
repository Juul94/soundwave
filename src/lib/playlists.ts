import { createClient } from "@/lib/supabase/client";

export type PlaylistItem = { id: string; name: string; count: number };

const sb = () => createClient();
export const cleanName = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 60);

/** The signed-in user's playlists, newest first, with song counts (RLS limits rows to the owner). */
export async function myPlaylists(): Promise<PlaylistItem[]> {
  const { data } = await sb().from("playlists").select("id, name, playlist_songs(count)").order("created_at", { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    count: (p.playlist_songs as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

/** Ids of the user's playlists that already contain this song. */
export async function playlistsWith(songId: string) {
  const { data } = await sb().from("playlist_songs").select("playlist_id").eq("song_id", songId);
  return new Set((data ?? []).map((r) => r.playlist_id as string));
}

export async function createPlaylist(name: string) {
  const { data, error } = await sb().from("playlists").insert({ name: cleanName(name) }).select("id").single();
  return error ? null : (data.id as string);
}

export async function renamePlaylist(id: string, name: string) {
  return !(await sb().from("playlists").update({ name: cleanName(name) }).eq("id", id)).error;
}

export async function deletePlaylist(id: string) {
  return !(await sb().from("playlists").delete().eq("id", id)).error;
}

export async function addToPlaylist(playlistId: string, songId: string) {
  const { error } = await sb().from("playlist_songs").insert({ playlist_id: playlistId, song_id: songId });
  return !error || error.code === "23505"; // already in it
}

export async function removeFromPlaylist(playlistId: string, songId: string) {
  return !(await sb().from("playlist_songs").delete().eq("playlist_id", playlistId).eq("song_id", songId)).error;
}
