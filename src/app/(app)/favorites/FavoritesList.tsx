"use client";

import { useEffect, useRef, useState } from "react";
import { Shuffle } from "lucide-react";
import { useFavorites } from "@/components/FavoritesProvider";
import { usePlayer } from "@/components/player/PlayerProvider";
import { SongList } from "@/components/SongList";
import { Empty } from "@/components/ui";
import type { SongView } from "@/types";
import { useT } from "@/components/I18n";

type FavoritesListProps = {
  songs: SongView[];
};

export function FavoritesList({ songs }: FavoritesListProps) {
  const fav = useFavorites();
  const p = usePlayer();
  const tr = useT();
  const [removed, setRemoved] = useState<SongView | null>(null);
  const visible = songs.filter((s) => fav.has(s.id));
  const prev = useRef(visible);

  useEffect(() => {
    const gone = prev.current.find((s) => !visible.some((v) => v.id === s.id));
    prev.current = visible;
    if (!gone) return;
    setRemoved(gone);
    const t = setTimeout(() => setRemoved(null), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map((s) => s.id).join(",")]);

  return (
    <>
      {visible.length ? (
        <>
          <button
            type="button"
            onClick={() => p.playQueue(visible, undefined, { shuffle: true })}
            className="mb-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            <Shuffle className="size-4" /> {tr.favorites.shuffle}
          </button>
          <SongList songs={visible} />
        </>
      ) : (
        <Empty title={tr.favorites.emptyTitle} body={tr.favorites.emptyBody} action={{ href: "/", label: tr.favorites.browse }} />
      )}
      {removed && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-40 z-50 mx-auto flex max-w-sm items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm shadow-2xl md:bottom-28"
        >
          <span className="truncate">{tr.favorites.removed}</span>
          <button
            type="button"
            onClick={() => {
              void fav.toggle(removed.id);
              setRemoved(null);
            }}
            className="ml-3 shrink-0 font-medium text-accent"
          >
            {tr.common.undo}
          </button>
        </div>
      )}
    </>
  );
}
