import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Music, Upload, UserPlus, Users } from "lucide-react";
import { Cover } from "@/components/Cover";
import { PageTitle } from "@/components/ui";
import { requireAdmin, withCovers } from "@/lib/auth";
import { SONG_SELECT } from "@/constants/songs";
import type { Song } from "@/types";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.nav };
}

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();
  const [songs, users, favs, recent] = await Promise.all([
    supabase.from("songs").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("favorites").select("song_id", { count: "exact", head: true }),
    supabase.from("songs").select(SONG_SELECT).order("created_at", { ascending: false }).limit(5),
  ]);
  const [recentSongs, T] = await Promise.all([withCovers(supabase, (recent.data ?? []) as Song[]), getT()]);
  const t = T.admin;

  const stats = [
    { label: t.statSongs, value: songs.count ?? 0, icon: Music },
    { label: t.statUsers, value: users.count ?? 0, icon: Users },
    { label: t.statFavorites, value: favs.count ?? 0, icon: Heart },
  ];

  return (
    <>
      <PageTitle title={t.title} sub={t.sub} />
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-4">
            <Icon className="size-5 text-accent" />
            <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link href="/admin/upload" className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-accent to-accent-2 p-4 font-medium text-white">
          <Upload className="size-5" /> {t.uploadSong}
        </Link>
        <Link href="/admin/users" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 font-medium hover:border-accent">
          <UserPlus className="size-5 text-accent" /> {t.invite}
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">{t.recent}</h2>
        {recentSongs.length === 0 ? (
          <p className="text-sm text-muted">{t.nothingYet}</p>
        ) : (
          <ul className="space-y-2">
            {recentSongs.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/songs/${s.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/5">
                  <Cover id={s.id} url={s.cover_thumb} className="size-11 rounded-lg" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.title}</span>
                    <span className="block text-xs text-muted">
                      {s.genres?.name} · {new Date(s.created_at).toLocaleDateString(T.locale)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
