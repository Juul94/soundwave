"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, X } from "lucide-react";
import {
  addToPlaylist, cleanName, createPlaylist, myPlaylists, playlistsWith, removeFromPlaylist,
} from "@/services/playlists";
import type { PlaylistItem, SongView } from "@/types";
import { useT } from "@/components/I18n";

type PlaylistPickerProps = {
  song: SongView;
  onClose: () => void;
};

/** Sheet to add a song to (or remove it from) the user's playlists, or to a new one. */
export function PlaylistPicker({ song, onClose }: PlaylistPickerProps) {
  const router = useRouter();
  const t = useT();
  const [lists, setLists] = useState<PlaylistItem[] | null>(null);
  const [inList, setInList] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    void Promise.all([myPlaylists(), playlistsWith(song.id)]).then(([l, w]) => {
      setLists(l);
      setInList(w);
    });
  }, [song.id]);

  const done = () => {
    if (changed) router.refresh();
    onClose();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = async (pl: PlaylistItem) => {
    const has = inList.has(pl.id);
    setBusy(pl.id);
    const ok = has ? await removeFromPlaylist(pl.id, song.id) : await addToPlaylist(pl.id, song.id);
    setBusy(null);
    if (!ok) return setNote(t.playlists.somethingWrong);
    const n = new Set(inList);
    if (has) n.delete(pl.id);
    else n.add(pl.id);
    setInList(n);
    setLists((l) => l?.map((x) => (x.id === pl.id ? { ...x, count: x.count + (has ? -1 : 1) } : x)) ?? l);
    setChanged(true);
    setNote(has ? t.playlists.removedFrom(pl.name) : t.playlists.addedTo(pl.name));
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = cleanName(name);
    if (!title) return;
    setBusy("new");
    const id = await createPlaylist(title);
    const ok = !!id && (await addToPlaylist(id, song.id));
    setBusy(null);
    if (!id || !ok) return setNote(t.common.playlistCreateFailed);
    setLists((l) => [{ id, name: title, count: 1 }, ...(l ?? [])]);
    setInList((s) => new Set(s).add(id));
    setName("");
    setChanged(true);
    setNote(t.playlists.addedTo(title));
  };

  return createPortal(
    // Events inside the portal still bubble through React to the song row, so stop them here.
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 md:items-center"
      onClick={(e) => (e.stopPropagation(), done())}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.playlists.addTo}
        onClick={(e) => e.stopPropagation()}
        className="sw-fade flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-surface p-4 safe-b md:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{t.playlists.addTo}</h2>
            <p className="truncate text-sm text-muted">{song.title}</p>
          </div>
          <button type="button" aria-label={t.common.close} onClick={done} className="flex size-11 items-center justify-center rounded-full hover:bg-white/5">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={create} className="mt-3 flex gap-2">
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
            disabled={!cleanName(name) || busy === "new"}
            className="inline-flex items-center gap-1 rounded-xl bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === "new" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {t.common.create}
          </button>
        </form>

        <p role="status" className="mt-2 min-h-5 text-sm text-accent">{note}</p>

        <ul className="-mx-2 mt-1 flex-1 overflow-y-auto">
          {!lists ? (
            <li className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted" /></li>
          ) : !lists.length ? (
            <li className="px-2 py-6 text-center text-sm text-muted">{t.playlists.pickerEmpty}</li>
          ) : (
            lists.map((pl) => {
              const has = inList.has(pl.id);
              return (
                <li key={pl.id}>
                  <button
                    type="button"
                    aria-pressed={has}
                    disabled={busy === pl.id}
                    onClick={() => toggle(pl)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-white/5 disabled:opacity-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{pl.name}</span>
                      <span className="block text-xs text-muted">{t.songs(pl.count)}</span>
                    </span>
                    <span className={`flex size-6 items-center justify-center rounded-full border ${has ? "border-accent bg-accent text-white" : "border-border"}`}>
                      {busy === pl.id ? <Loader2 className="size-3.5 animate-spin" /> : has && <Check className="size-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
