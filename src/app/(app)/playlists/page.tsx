import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { PlaylistsView } from "./PlaylistsView";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).playlists.title };
}

export default async function PlaylistsPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("playlists")
    .select("id, name, playlist_songs(count)")
    .order("created_at", { ascending: false });
  const t = await getT();
  const lists = (data ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    count: (p.playlist_songs as unknown as { count: number }[])[0]?.count ?? 0,
  }));
  return (
    <>
      <PageTitle title={t.playlists.title} />
      <PlaylistsView lists={lists} />
    </>
  );
}
