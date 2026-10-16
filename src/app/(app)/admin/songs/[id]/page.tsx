import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SongForm } from "../../SongForm";
import { PageTitle } from "@/components/ui";
import { requireAdmin, withCovers } from "@/lib/auth";
import { listGenres } from "@/lib/library";
import type { Song } from "@/lib/types";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.editSong };
}

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("songs").select("*").eq("id", id).maybeSingle<Song>();
  if (!data) notFound();
  const [genres, [song], { data: lyr }, T] = await Promise.all([
    listGenres(supabase),
    withCovers(supabase, [data]),
    supabase.from("song_lyrics").select("lyrics").eq("song_id", id).maybeSingle(),
    getT(),
  ]);
  return (
    <>
      <PageTitle title={T.admin.editSong} />
      <SongForm genres={genres} song={song} maxAudioMb={Number(process.env.NEXT_PUBLIC_MAX_AUDIO_MB) || 50} lyrics={(lyr?.lyrics as string | undefined) ?? ""} />
    </>
  );
}
