import type { Metadata } from "next";
import { Empty } from "@/components/ui";
import { requireUser, withCovers } from "@/lib/auth";
import { SONG_SELECT } from "@/constants/songs";
import type { Song } from "@/types";
import { PlaylistView } from "./PlaylistView";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).playlists.playlist };
}

export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  // RLS only returns the signed-in user's own playlists.
  const { data: pl } = /^[0-9a-f-]{36}$/i.test(id)
    ? await supabase.from("playlists").select("id, name").eq("id", id).maybeSingle()
    : { data: null };
  if (!pl) {
    const t = (await getT()).playlists;
    return <Empty title={t.notFound} body={t.notFoundBody} action={{ href: "/playlists", label: t.yours }} />;
  }

  const { data } = await supabase
    .from("playlist_songs")
    .select(`added_at, songs(${SONG_SELECT})`)
    .eq("playlist_id", id)
    .order("added_at", { ascending: true });
  const songs = (data ?? [])
    .map((r) => (r as unknown as { songs: Song | null }).songs)
    .filter((s): s is Song => !!s);

  return <PlaylistView id={pl.id} name={pl.name} songs={await withCovers(supabase, songs)} />;
}
