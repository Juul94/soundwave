"use client";

import { useRef } from "react";
import { Loader2, Pause, Play, SkipForward } from "lucide-react";
import { Cover } from "@/components/Cover";
import { DownloadButton, FavButton } from "@/components/SongList";
import { usePlayer } from "./PlayerProvider";
import { useT } from "@/components/I18n";

export function MiniPlayer() {
  const p = usePlayer();
  const s = p.current;
  const down = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const t = useT();
  if (!s) return null;
  const pct = p.duration ? Math.min(100, (p.time / p.duration) * 100) : 0;

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-30 md:bottom-0 md:left-60 md:px-4 md:pb-3">
      <div className="sw-fade relative overflow-hidden bg-surface-2/95 md:mx-auto md:max-w-[700px] md:rounded-2xl md:border md:border-border shadow-2xl backdrop-blur">
        <div
          className="flex items-center gap-3 p-2 py-[13px] pr-1 md:py-2"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(e) => {
            down.current = { x: e.clientX, y: e.clientY };
            swiped.current = false;
          }}
          onPointerUp={(e) => {
            const d = down.current;
            down.current = null;
            if (!d) return;
            const mx = e.clientX - d.x;
            const my = e.clientY - d.y;
            if (Math.abs(mx) > 50 && Math.abs(mx) > Math.abs(my) * 1.5) {
              swiped.current = true;
              if (mx < 0) p.next();
              else p.prev();
            }
          }}
          onPointerCancel={() => (down.current = null)}
        >
          <button
            type="button"
            onClick={() => !swiped.current && p.setExpanded(true)}
            aria-label={t.player.openFull}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus:outline-none"
          >
            <Cover id={s.id} url={s.cover_thumb} className="size-11 shrink-0 rounded-lg" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{s.title}</span>
              <span className="block truncate text-xs text-muted">
                {p.error ? t.player.playbackError : (s.artist ?? s.genres?.name ?? "Soundwave")}
              </span>
            </span>
          </button>
          <DownloadButton song={s} className="hidden sm:flex" />
          <FavButton songId={s.id} />
          <button
            type="button"
            onClick={p.error ? p.retry : p.toggle}
            aria-label={p.playing ? t.common.pause : t.common.play}
            className="flex size-11 items-center justify-center rounded-full bg-white text-black transition active:scale-95"
          >
            {p.loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : p.playing ? (
              <Pause className="size-5 fill-black" />
            ) : (
              <Play className="size-5 fill-black" />
            )}
          </button>
          <button
            type="button"
            onClick={p.next}
            aria-label={t.common.nextSong}
            className="flex size-11 items-center justify-center rounded-full text-muted hover:text-foreground"
          >
            <SkipForward className="size-5" />
          </button>
        </div>
        <div className="h-0.5 bg-border" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
