"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown, ListMusic, Loader2, MicVocal, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, X,
} from "lucide-react";
import { Cover } from "@/components/Cover";
import { SongMenu } from "@/components/SongList";
import { CastButton } from "./CastButton";
import { LyricsPanel } from "./Lyrics";
import { QueueList } from "./QueueList";
import { usePlayer } from "./PlayerProvider";
import { useT } from "@/components/I18n";

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

// Mounted only while open, so lyrics/queue views reset to the cover each time the player opens.
export function FullPlayer() {
  const p = usePlayer();
  return p.expanded && p.current ? <FullPlayerView /> : null;
}

function FullPlayerView() {
  const p = usePlayer();
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const t = useT();
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [settle, setSettle] = useState<0 | 1 | -1>(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const s = p.current;

  useEffect(() => {
    if (!p.expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && p.setExpanded(false);
    window.addEventListener("keydown", onKey);
    // lock the page behind the player
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prev;
    };
  }, [p]);

  if (!p.expanded || !s) return null;

  const pct = p.duration ? (p.time / p.duration) * 100 : 0;

  const idx = p.order.indexOf(s.id);
  const neighbour = (k: 1 | -1) => {
    let j = idx + k;
    if (j < 0 || j >= p.order.length) {
      if (p.repeat === "off" || p.order.length < 2) return null;
      j = (j + p.order.length) % p.order.length;
    }
    return p.queue.find((q) => q.id === p.order[j]) ?? null;
  };
  const prevSong = neighbour(-1);
  const nextSong = neighbour(1);

  const onDown = (e: React.PointerEvent) => {
    if (settle) return;
    start.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const mx = e.clientX - start.current.x;
    const my = e.clientY - start.current.y;
    if (Math.abs(mx) > Math.abs(my)) {
      const blocked = (mx < 0 && !nextSong) || (mx > 0 && !prevSong);
      setDx(blocked ? mx * 0.25 : mx);
      setDy(0);
    } else {
      setDy(Math.max(0, Math.min(240, my)));
      setDx(0);
    }
  };
  const resetDrag = () => {
    start.current = null;
    setDragging(false);
    setDx(0);
    setDy(0);
  };
  // Slide the whole artwork off, then switch song and re-centre without animation.
  const commit = (dir: 1 | -1) => {
    start.current = null;
    setDragging(false);
    setDy(0);
    setSettle(dir);
    setTimeout(() => {
      setDragging(true);
      setSettle(0);
      setDx(0);
      if (dir === 1) p.next();
      else p.prev();
      requestAnimationFrame(() => requestAnimationFrame(() => setDragging(false)));
    }, 270);
  };
  const onUp = (e: React.PointerEvent) => {
    const st = start.current;
    if (!st) return resetDrag();
    const mx = e.clientX - st.x;
    const my = e.clientY - st.y;
    if (Math.abs(mx) > 60 && Math.abs(mx) > Math.abs(my) * 1.5) {
      if (mx < 0 && nextSong) return commit(1);
      if (mx > 0 && prevSong) {
        if (p.time > 3) {
          resetDrag();
          return p.prev(); // restarts the current song
        }
        return commit(-1);
      }
    } else if (my > 90 && my > Math.abs(mx) * 1.5) {
      resetDrag();
      return p.setExpanded(false);
    }
    resetDrag();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.player.nowPlaying}
      className={`sw-fade fixed inset-0 z-50 flex flex-col overscroll-contain bg-background safe-t safe-b ${showLyrics ? "overflow-hidden" : "overflow-y-auto"}`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {s.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.cover_url} alt="" className="absolute inset-0 size-full scale-150 object-cover opacity-50 blur-3xl" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 via-background/70 to-background" />
      </div>
      <div className={`relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-3 ${showLyrics ? "min-h-0" : ""}`}>
        <div className="relative flex items-center justify-between">
          <button type="button" aria-label={t.player.closePlayer} onClick={() => p.setExpanded(false)} className="flex size-11 items-center justify-center rounded-full hover:bg-white/5">
            <ChevronDown className="size-6" />
          </button>
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-muted">{t.player.nowPlaying}</span>
          <div className="flex items-center">
          <CastButton />
          <button
            type="button"
            aria-label={t.player.showQueue}
            aria-pressed={showQueue}
            onClick={() => {
              setShowQueue((v) => !v);
              setShowLyrics(false);
            }}
            className={`flex size-11 items-center justify-center rounded-full hover:bg-white/5 ${showQueue ? "text-accent" : ""}`}
          >
            <ListMusic className="size-5" />
          </button>
          </div>
        </div>

        {showQueue ? (
          <QueueList />
        ) : (
          <>
            {showLyrics ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowLyrics(false)}
                  className="mt-3 inline-flex items-center gap-1.5 self-center rounded-full border border-border bg-white/5 px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
                >
                  <X className="size-3.5" /> {t.player.closeLyrics}
                </button>
                <LyricsPanel key={s.id} songId={s.id} />
              </>
            ) : (
            <div
              className="mt-6 flex flex-1 select-none items-center"
              style={{ touchAction: "none" }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={resetDrag}
            >
              <div className="w-full overflow-hidden">
                <div
                  className="flex w-full"
                  style={{
                    transform: `translate(calc(-100% + ${settle ? 0 : dx}px - ${settle * 100}%), ${dy}px)`,
                    transition: dragging ? "none" : "transform .25s ease-out",
                  }}
                >
                  {[prevSong, s, nextSong].map((song, k) => (
                    // keyed by song so the sliding node itself becomes the centred one (no re-load flicker)
                    <div key={song ? `${song.id}${k === 2 && prevSong?.id === song.id ? "-n" : ""}` : `empty-${k}`} className="w-full shrink-0 px-1" style={k !== 1 && dy > 0 ? { visibility: "hidden" } : undefined}>
                      {song && (
                        <Cover id={song.id} url={song.cover_url} priority className="w-full rounded-xl shadow-2xl shadow-black/50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}

            <div className={`${showLyrics ? "mt-1" : "mt-8"} flex items-center gap-2`}>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-2xl font-bold tracking-tight">{s.title}</h2>
                <p className="break-words text-base text-muted">
                  {[s.artist, s.genres?.name].filter(Boolean).join(" · ") || "Soundwave"}
                </p>
                {s.plays > 0 && <p className="text-sm text-muted">{t.plays(s.plays)}</p>}
              </div>
              <SongMenu song={s} className="size-12 [&_svg]:size-6" />
            </div>
          </>
        )}

        {p.error && (
          <p role="alert" className="mt-3 flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {t.player.errors[p.error]}
            <button type="button" onClick={p.retry} className="ml-3 font-medium underline">{t.common.retry}</button>
          </p>
        )}

        <div className={showLyrics ? "mt-2" : "mt-4"}>
          <input
            type="range"
            className="sw-range"
            aria-label={t.player.seek}
            min={0}
            max={p.duration || 0}
            step={0.5}
            value={Math.min(p.time, p.duration || 0)}
            style={{ ["--p" as string]: `${pct}%` }}
            onChange={(e) => p.seek(Number(e.target.value))}
          />
          <div className="-mt-1 flex justify-between text-xs tabular-nums text-muted">
            <span>{fmt(p.time)}</span>
            <span>{fmt(p.duration)}</span>
          </div>
        </div>

        <div className={`${showLyrics ? "mt-1" : "mt-4"} flex items-center justify-between`}>
          <button type="button" aria-label={t.common.shuffle} aria-pressed={p.shuffle} onClick={p.toggleShuffle}
            className={`flex size-11 items-center justify-center rounded-full ${p.shuffle ? "text-accent" : "text-muted"}`}>
            <Shuffle className="size-5" />
          </button>
          <button type="button" aria-label={t.player.previous} onClick={p.prev} className="flex size-12 items-center justify-center rounded-full hover:bg-white/5">
            <SkipBack className="size-7 fill-current" />
          </button>
          <button type="button" aria-label={p.playing ? t.common.pause : t.common.play} onClick={p.error ? p.retry : p.toggle}
            className="flex size-16 items-center justify-center rounded-full bg-white text-black transition active:scale-95">
            {p.loading ? <Loader2 className="size-7 animate-spin" /> : p.playing ? <Pause className="size-7 fill-black" /> : <Play className="size-7 fill-black" />}
          </button>
          <button type="button" aria-label={t.common.nextSong} onClick={p.next} className="flex size-12 items-center justify-center rounded-full hover:bg-white/5">
            <SkipForward className="size-7 fill-current" />
          </button>
          <button type="button" aria-label={t.player.repeat[p.repeat]} onClick={p.cycleRepeat}
            className={`flex size-11 items-center justify-center rounded-full ${p.repeat !== "off" ? "text-accent" : "text-muted"}`}>
            {p.repeat === "one" ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
          </button>
        </div>

        <div className={`${showLyrics ? "mt-3" : "mt-6"} flex justify-center`}>
          <button
            type="button"
            aria-pressed={showLyrics}
            onClick={() => {
              setShowLyrics((v) => !v);
              setShowQueue(false);
            }}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              showLyrics ? "border-accent bg-accent/15 text-foreground" : "border-border bg-white/5 text-muted hover:text-foreground"
            }`}
          >
            {showLyrics ? <><X className="size-4" /> {t.player.closeLyrics}</> : <><MicVocal className="size-4" /> {t.player.lyrics}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
