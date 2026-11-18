import type { Metadata } from "next";
import Link from "next/link";
import { DeleteSongButton } from "./DeleteSongButton";
import { Cover } from "@/components/Cover";
import { Empty, PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { listGenres, searchSongs } from "@/services/library";
import { getT } from "@/i18n/server";
import { firstParam, parseSongSort } from "@/utils/searchParams";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.manageSongs };
}

export default async function AdminSongs({ searchParams }: PageProps<"/admin/songs">) {
  const sp = await searchParams;
  const q = firstParam(sp.q) ?? "";
  const genre = firstParam(sp.genre) ?? "";
  const sort = parseSongSort(sp.sort);
  const { supabase } = await requireAdmin();
  const [genres, { songs, total }, T] = await Promise.all([
    listGenres(supabase),
    searchSongs(supabase, { q, genre, sort, limit: 200 }),
    getT(),
  ]);
  const t = T.admin;

  return (
    <>
      <PageTitle title={t.songsTitle} sub={t.total(total)} />
      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder={T.browse.searchSongs} aria-label={T.browse.searchSongs}
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-accent" />
        <select name="genre" defaultValue={genre} aria-label={t.genre} className="rounded-xl border border-border bg-surface px-3 py-2.5">
          <option value="">{t.allGenres}</option>
          {genres.map((g) => <option key={g.id} value={g.slug}>{g.name}</option>)}
        </select>
        <select name="sort" defaultValue={sort} aria-label={T.common.sort} className="rounded-xl border border-border bg-surface px-3 py-2.5">
          <option value="new">{T.common.newest}</option>
          <option value="az">{T.common.az}</option>
          <option value="plays">{T.common.mostPlayed}</option>
        </select>
        <button className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white">{t.apply}</button>
      </form>

      {songs.length === 0 ? (
        <Empty title={t.noSongs} body={t.noSongsBody} action={{ href: "/admin/upload", label: t.uploadSong }} />
      ) : (
        <ul className="space-y-2">
          {songs.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2">
              <Cover id={s.id} url={s.cover_thumb} className="size-12 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.title}</p>
                <p className="truncate text-xs text-muted">
                  {[s.genres?.name, s.artist, new Date(s.created_at).toLocaleDateString(T.locale)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Link href={`/admin/songs/${s.id}`} className="rounded-lg border border-border px-3 py-2 text-sm hover:border-accent">{T.common.edit}</Link>
              <DeleteSongButton id={s.id} title={s.title} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
