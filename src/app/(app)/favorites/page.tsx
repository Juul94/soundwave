import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { FavoritesList } from "./FavoritesList";
import { requireUser } from "@/lib/auth";
import { songsFromJoin } from "@/lib/library";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).favorites.title };
}

export default async function FavoritesPage() {
  const { supabase, user } = await requireUser();
  const [favs, t] = await Promise.all([songsFromJoin(supabase, "favorites", user.id, 200), getT()]);
  return (
    <>
      <PageTitle title={t.favorites.title} />
      <FavoritesList songs={favs} />
    </>
  );
}
