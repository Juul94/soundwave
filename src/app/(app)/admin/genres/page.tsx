import type { Metadata } from "next";
import { GenreManager } from "./GenreManager";
import { PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { listGenres } from "@/services/library";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.genresTitle };
}

export default async function GenresPage() {
  const { supabase } = await requireAdmin();
  const [genres, T] = await Promise.all([listGenres(supabase), getT()]);
  const { data: songs } = await supabase.from("songs").select("genre_id");
  const counts: Record<string, number> = {};
  songs?.forEach((s) => (counts[s.genre_id] = (counts[s.genre_id] ?? 0) + 1));
  return (
    <>
      <PageTitle title={T.admin.genresTitle} sub={T.admin.genresSub} />
      <GenreManager genres={genres.map((g) => ({ id: g.id, name: g.name, count: counts[g.id] ?? 0 }))} />
    </>
  );
}
