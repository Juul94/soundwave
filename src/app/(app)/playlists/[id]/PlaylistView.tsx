"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Play, Shuffle, Trash2 } from "lucide-react";
import { usePlayer } from "@/components/player/PlayerProvider";
import { PlaylistScope } from "@/components/PlaylistScope";
import { SongList } from "@/components/SongList";
import { cleanName, deletePlaylist, removeFromPlaylist, renamePlaylist } from "@/services/playlists";
import type { SongView } from "@/types";
import { useT } from "@/components/I18n";

type PlaylistViewProps = {
  id: string;
  name: string;
  songs: SongView[];
};

export function PlaylistView({ id, name, songs }: PlaylistViewProps) {
  const p = usePlayer();
  const router = useRouter();
  const t = useT();
  const [title, setTitle] = useState(name);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const visible = songs.filter((s) => !removed.has(s.id));

  const scope = useMemo(
    () => ({
      remove: async (songId: string) => {
        setRemoved((r) => new Set(r).add(songId)); // optimistic
        if (await removeFromPlaylist(id, songId)) return;
        setRemoved((r) => {
          const n = new Set(r);
          n.delete(songId);
          return n;
        });
        setError(t.playlists.removeFailed);
      },
    }),
    [id, t],
  );

  const rename = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = cleanName(draft);
    if (!next || next === title) return setEditing(false);
    if (!(await renamePlaylist(id, next))) return setError(t.playlists.renameFailed);
    setTitle(next);
    setEditing(false);
    setError(null);
  };

  const remove = async () => {
    if (!confirm(t.playlists.confirmDelete(title))) return;
    if (!(await deletePlaylist(id))) return setError(t.playlists.deleteFailed);
    router.replace("/playlists");
    router.refresh();
  };

  return (
    <>
      <Link href="/playlists" className="-ml-1 mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="size-4" /> {t.playlists.title}
      </Link>

      <header className="mb-4 flex items-start justify-between gap-3">
        {editing ? (
          <form onSubmit={rename} className="flex min-w-0 flex-1 gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={60}
              aria-label={t.playlists.name}
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-base outline-none focus:border-accent"
            />
            <button type="submit" className="rounded-xl bg-accent px-4 text-sm font-medium text-white">{t.common.save}</button>
            <button type="button" onClick={() => (setEditing(false), setDraft(title))} className="rounded-xl px-3 text-sm text-muted">{t.common.cancel}</button>
          </form>
        ) : (
          <>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-muted">{t.songs(visible.length)}</p>
            </div>
            <div className="flex shrink-0">
              <button type="button" aria-label={t.playlists.rename} onClick={() => setEditing(true)} className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground">
                <Pencil className="size-5" />
              </button>
              <button type="button" aria-label={t.playlists.delete} onClick={remove} className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-red-300">
                <Trash2 className="size-5" />
              </button>
            </div>
          </>
        )}
      </header>

      {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}

      {visible.length ? (
        <>
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => p.playQueue(visible, visible[0].id, { shuffle: false })}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              <Play className="size-4 fill-white" /> {t.common.play}
            </button>
            <button
              type="button"
              onClick={() => p.playQueue(visible, undefined, { shuffle: true })}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/5 px-4 py-2 text-sm font-medium"
            >
              <Shuffle className="size-4" /> {t.common.shuffle}
            </button>
          </div>
          <PlaylistScope.Provider value={scope}>
            <SongList songs={visible} />
          </PlaylistScope.Provider>
        </>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
          {t.playlists.noSongs}
        </p>
      )}
    </>
  );
}
