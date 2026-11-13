import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { withCovers } from "@/lib/auth";
import { SONG_SELECT } from "@/constants/songs";
import type { Genre, Song } from "@/types";

type Sb = Awaited<ReturnType<typeof createClient>>;

export const PAGE_SIZE = 40;

/** Strip characters that have meaning inside a PostgREST filter string. */
const clean = (s: string) => s.replace(/[,()%*\\"':]/g, " ").trim().slice(0, 80);

export async function listGenres(sb: Sb) {
  const { data } = await sb.from("genres").select("*").order("name");
  return (data ?? []) as Genre[];
}

export async function searchSongs(
  sb: Sb,
  o: { q?: string; genre?: string; sort?: "new" | "az" | "plays"; limit?: number },
) {
  // genre filter via an inner join, so it is one round trip instead of slug lookup + query
  let query = sb.from("songs").select(o.genre ? "*, genres!inner(name, slug)" : SONG_SELECT, { count: "exact" });
  if (o.genre) query = query.eq("genres.slug", o.genre);

  const q = clean(o.q ?? "");
  if (q) {
    const { data: gm } = await sb.from("genres").select("id").ilike("name", `%${q}%`);
    const parts = [`title.ilike.%${q}%`, `artist.ilike.%${q}%`, `album.ilike.%${q}%`];
    if (!q.includes(" ")) parts.push(`mood_tags.cs.{${q.toLowerCase()}}`);
    if (gm?.length) parts.push(`genre_id.in.(${gm.map((g) => g.id).join(",")})`);
    query = query.or(parts.join(","));
  }

  query = o.sort === "az"
    ? query.order("title", { ascending: true })
    : o.sort === "plays"
      ? query.order("plays", { ascending: false }).order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });

  const { data, count } = await query.limit(o.limit ?? PAGE_SIZE);
  return { songs: await withCovers(sb, (data ?? []) as Song[]), total: count ?? 0 };
}

export async function songsFromJoin(sb: Sb, table: "favorites" | "recently_played", userId: string, limit = 20) {
  const orderCol = table === "favorites" ? "created_at" : "played_at";
  const { data } = await sb
    .from(table)
    .select(`${orderCol}, songs(${SONG_SELECT})`)
    .eq("user_id", userId)
    .order(orderCol, { ascending: false })
    .limit(limit);
  const songs = (data ?? [])
    .map((r) => (r as unknown as { songs: Song | null }).songs)
    .filter((s): s is Song => !!s);
  return withCovers(sb, songs);
}
