import type { Metadata } from "next";
import { SongForm } from "../SongForm";
import { PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { listGenres } from "@/lib/library";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.tabs.upload };
}

export default async function UploadPage() {
  const { supabase } = await requireAdmin();
  const [genres, T] = await Promise.all([listGenres(supabase), getT()]);
  return (
    <>
      <PageTitle title={T.admin.uploadSong} sub={T.admin.uploadSub} />
      <SongForm genres={genres} maxAudioMb={Number(process.env.NEXT_PUBLIC_MAX_AUDIO_MB) || 50} />
    </>
  );
}
