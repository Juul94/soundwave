import type { Metadata } from "next";
import Link from "next/link";
import { BrowseControls } from "./BrowseControls";
import { CastButton } from "@/components/player/CastButton";
import { SongList } from "@/components/SongList";
import { Empty, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listGenres, PAGE_SIZE, searchSongs } from "@/lib/library";
import { getT } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Soundwave" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; genre?: string; sort?: string; limit?: string }>;
}) {
  const sp = await searchParams;
  const t = await getT();
  const { supabase } = await requireUser();
  const sort = sp.sort === "az" ? "az" : "new";
  const limit = Math.min(Math.max(Number(sp.limit) || PAGE_SIZE, PAGE_SIZE), 400);
  const [genres, { songs, total }] = await Promise.all([
    listGenres(supabase),
    searchSongs(supabase, { q: sp.q, genre: sp.genre, sort, limit }),
  ]);
  const filtered = !!(sp.q || sp.genre);
  const more = new URLSearchParams({ ...(sp.q && { q: sp.q }), ...(sp.genre && { genre: sp.genre }), sort, limit: String(limit + PAGE_SIZE) });

  return (
    <>
      <PageTitle title={t.browse.title} sub={t.songs(total)} action={<CastButton />} />
      <BrowseControls genres={genres} songs={songs} q={sp.q ?? ""} genre={sp.genre ?? ""} sort={sort}>
      {songs.length === 0 ? (
        <Empty
          title={filtered ? t.browse.noMatches : t.browse.noMusic}
          body={filtered ? t.browse.noMatchesBody : t.browse.noMusicBody}
          action={filtered ? { href: "/", label: t.browse.resetFilters } : undefined}
        />
      ) : (
        <SongList songs={songs} />
      )}
      {songs.length < total && (
        <div className="mt-6 text-center">
          <Link href={`/?${more}`} scroll={false} className="rounded-xl border border-border px-5 py-2.5 text-sm hover:border-accent">
            {t.browse.showMore}
          </Link>
        </div>
      )}
      </BrowseControls>
    </>
  );
}
