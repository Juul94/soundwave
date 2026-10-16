"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ListMusic, Loader2, Plus } from "lucide-react";
import { cleanName, createPlaylist, type PlaylistItem } from "@/lib/playlists";
import { useT } from "@/components/I18n";

export function PlaylistsView({ lists }: { lists: PlaylistItem[] }) {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = cleanName(name);
    if (!title) return;
    setBusy(true);
    setError(null);
    const id = await createPlaylist(title);
    if (!id) {
      setBusy(false);
      return setError(t.common.playlistCreateFailed);
    }
    router.push(`/playlists/${id}`);
  };

  return (
    <>
      <form onSubmit={create} className="mb-2 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder={t.common.newPlaylistName}
          aria-label={t.common.newPlaylistName}
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!cleanName(name) || busy}
          className="inline-flex items-center gap-1 rounded-xl bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {t.common.create}
        </button>
      </form>
      <p role="alert" className="mb-4 min-h-5 text-sm text-red-300">{error}</p>

      {lists.length ? (
        <ul className="space-y-1">
          {lists.map((pl) => (
            <li key={pl.id}>
              <Link href={`/playlists/${pl.id}`} className="sw-fade flex items-center gap-3 rounded-xl p-2 hover:bg-white/5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <ListMusic className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{pl.name}</span>
                  <span className="block text-sm text-muted">{t.songs(pl.count)}</span>
                </span>
                <ChevronRight className="size-5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
          {t.playlists.empty}
        </p>
      )}
    </>
  );
}
