import type { Metadata } from "next";
import Link from "next/link";
import { BrowseControls } from "./BrowseControls";
import { CastButton } from "@/components/player/CastButton";
import { SongList } from "@/components/SongList";
import { Empty, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listGenres, PAGE_SIZE, searchSongs } from "@/services/library";
import { getT } from "@/i18n/server";
import { firstParam, parseSongSort } from "@/utils/searchParams";

export const metadata: Metadata = { title: "Soundwave" };

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const q = firstParam(sp.q) ?? "";
  const genre = firstParam(sp.genre) ?? "";
  const sort = parseSongSort(sp.sort);
  const t = await getT();
  const { supabase } = await requireUser();
  const limit = Math.min(Math.max(Number(firstParam(sp.limit)) || PAGE_SIZE, PAGE_SIZE), 400);
  const [genres, { songs, total }] = await Promise.all([
    listGenres(supabase),
    searchSongs(supabase, { q, genre, sort, limit }),
  ]);
  const filtered = !!(q || genre);
  const more = new URLSearchParams({ ...(q && { q }), ...(genre && { genre }), sort, limit: String(limit + PAGE_SIZE) });

  return (
    <>
      <PageTitle title={t.browse.title} sub={t.songs(total)} action={<CastButton />} />
      <BrowseControls genres={genres} songs={songs} q={q} genre={genre} sort={sort}>
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
