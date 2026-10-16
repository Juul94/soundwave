"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Heart, ListMinus, ListPlus, ListStart, Loader2, MoreVertical, Pause, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Cover } from "@/components/Cover";
import { useFavorites } from "@/components/FavoritesProvider";
import { PlaylistPicker } from "@/components/PlaylistPicker";
import { usePlaylistScope } from "@/components/PlaylistScope";
import { usePlayer } from "@/components/player/PlayerProvider";
import type { SongView } from "@/lib/types";
import { useT } from "@/components/I18n";

export function FavButton({ songId, className = "" }: { songId: string; className?: string }) {
  const fav = useFavorites();
  const on = fav.has(songId);
  const t = useT();
  return (
    <button
      type="button"
      aria-label={on ? t.favorites.remove : t.favorites.add}
      aria-pressed={on}
      onClick={(e) => {
        e.stopPropagation();
        void fav.toggle(songId);
      }}
      className={`flex size-11 items-center justify-center rounded-full transition hover:bg-white/5 ${className}`}
    >
      <Heart className={`size-5 ${on ? "fill-accent text-accent" : "text-muted"}`} />
    </button>
  );
}

/** Starts a download of the MP3; false if the link could not be created. */
async function downloadSong(song: SongView) {
  const name = [song.artist, song.title].filter(Boolean).join(" - ").replace(/[\/:*?"<>|]+/g, "").trim() || "song";
  const { data, error } = await createClient()
    .storage.from("audio")
    .createSignedUrl(song.audio_storage_path, 120, { download: `${name}.mp3` });
  if (error || !data) return false;
  const a = document.createElement("a");
  a.href = data.signedUrl;
  a.download = `${name}.mp3`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

export function DownloadButton({ song, className = "" }: { song: SongView; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const t = useT();
  return (
    <button
      type="button"
      aria-label={failed ? t.song.downloadFailed : t.song.downloadOf(song.title)}
      title={failed ? t.song.downloadFailed : t.song.download}
      disabled={busy}
      onClick={async (e) => {
        e.stopPropagation();
        setBusy(true);
        setFailed(false);
        const ok = await downloadSong(song);
        setBusy(false);
        setFailed(!ok);
      }}
      className={`flex size-11 items-center justify-center rounded-full transition hover:bg-white/5 disabled:opacity-50 ${className}`}
    >
      {busy ? <Loader2 className="size-5 animate-spin text-muted" /> : <Download className={`size-5 ${failed ? "text-red-300" : "text-muted"}`} />}
    </button>
  );
}

/** ⋮ button with playlists, Download and Favorite. */
export function SongMenu({ song, className = "" }: { song: SongView; className?: string }) {
  const fav = useFavorites();
  const p = usePlayer();
  const scope = usePlaylistScope();
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ right: number; top?: number; bottom?: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const on = fav.has(song.id);
  const t = useT();

  const close = () => {
    setPos(null);
    setNote(null);
  };
  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const open = () => {
    const r = btn.current!.getBoundingClientRect();
    const right = window.innerWidth - r.right;
    // Open upwards when there is no room below (e.g. above the mini player).
    setPos(window.innerHeight - r.bottom < (scope ? 310 : 270) ? { right, bottom: window.innerHeight - r.top + 4 } : { right, top: r.bottom + 4 });
  };
  const flash = (text: string) => {
    setNote(text);
    setTimeout(close, 1200);
  };
  const closePicker = useCallback(() => setPicker(false), []);

  const item = "flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/5 disabled:opacity-50";
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={t.song.moreActions}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        onClick={(e) => {
          e.stopPropagation();
          if (pos) close();
          else open();
        }}
        className={`flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-white/5 hover:text-foreground ${className}`}
      >
        <MoreVertical className="size-5" />
      </button>
      {pos &&
        createPortal(
          // Clicks inside the portal still bubble through React to the row, so stop them here.
          <div className="fixed inset-0 z-[60]" onClick={(e) => (e.stopPropagation(), close())}>
            <div
              role="menu"
              style={pos}
              onClick={(e) => e.stopPropagation()}
              className="sw-fade absolute w-56 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-2xl shadow-black/50"
            >
              {note ? (
                <p className="flex items-center gap-3 px-4 py-3 text-sm">{note}</p>
              ) : (
                <>
                  <button type="button" role="menuitem" className={item} onClick={() => {
                    const had = !!p.current;
                    p.playNext(song);
                    flash(had ? t.song.playingNext : t.song.playing);
                  }}>
                    <ListStart className="size-4 text-muted" /> {t.song.playNext}
                  </button>
                  <button type="button" role="menuitem" className={item} onClick={() => {
                    close();
                    setPicker(true);
                  }}>
                    <ListPlus className="size-4 text-muted" /> {t.playlists.addTo}
                  </button>
                  {scope && (
                    <button type="button" role="menuitem" className={item} onClick={() => {
                      scope.remove(song.id);
                      close();
                    }}>
                      <ListMinus className="size-4 text-muted" /> {t.playlists.removeFromThis}
                    </button>
                  )}
                  <button type="button" role="menuitem" disabled={busy} className={item} onClick={async () => {
                    setBusy(true);
                    const ok = await downloadSong(song);
                    setBusy(false);
                    if (ok) close();
                    else flash(t.song.downloadFailed);
                  }}>
                    {busy ? <Loader2 className="size-4 animate-spin text-muted" /> : <Download className="size-4 text-muted" />} {t.song.download}
                  </button>
                  <button type="button" role="menuitem" className={item} onClick={() => {
                    void fav.toggle(song.id);
                    close();
                  }}>
                    <Heart className={`size-4 ${on ? "fill-accent text-accent" : "text-muted"}`} /> {on ? t.favorites.remove : t.favorites.add}
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
      {picker && <PlaylistPicker song={song} onClose={closePicker} />}
    </>
  );
}

const SWIPE = 80;

/** Row: tap plays; swipe right = play next, swipe left = toggle favorite. */
export function SongRow({ song, list }: { song: SongView; list: SongView[] }) {
  const p = usePlayer();
  const fav = useFavorites();
  const active = p.current?.id === song.id;
  const playingNow = active && p.playing;
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; axis?: "x" | "y" } | null>(null);
  const swiped = useRef(false);
  const t = useT();

  const flash = (text: string) => {
    setNote(text);
    setTimeout(() => setNote(null), 1500);
  };
  const end = () => {
    drag.current = null;
    setDragging(false);
    setDx(0);
  };
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      d.axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      if (d.axis === "x") {
        swiped.current = true;
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
    if (d.axis === "x") setDx(Math.max(-120, Math.min(120, mx)));
  };
  const onUp = () => {
    if (dx >= SWIPE) {
      p.playNext(song);
      flash(p.current ? t.song.playingNext : t.song.playing);
    } else if (dx <= -SWIPE) {
      const on = fav.has(song.id);
      void fav.toggle(song.id);
      flash(on ? t.favorites.removed : t.favorites.added);
    }
    end();
  };

  return (
    <li className="sw-fade relative overflow-hidden rounded-xl">
      <div
        aria-hidden="true"
        style={{ width: Math.abs(dx) }}
        className={`absolute inset-y-0 flex items-center justify-center overflow-hidden rounded-xl ${dx > 0 ? "left-0 bg-accent/20" : "right-0 bg-accent/20"} ${dx ? "" : "invisible"}`}
      >
        {dx > 0 ? (
          <ListPlus className={`size-5 transition ${dx >= SWIPE ? "scale-125 text-accent" : "text-muted"}`} />
        ) : (
          <Heart className={`size-5 transition ${dx <= -SWIPE ? "scale-125 fill-accent text-accent" : "text-muted"}`} />
        )}
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label={t.song.playTitle(song.title)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={end}
        onClickCapture={(e) => {
          // a swipe ends with a click; don't play or open the menu
          if (swiped.current) {
            swiped.current = false;
            e.stopPropagation();
          }
        }}
        onClick={() => (active ? p.toggle() : p.playQueue(list, song.id))}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (active) p.toggle();
            else p.playQueue(list, song.id);
          }
        }}
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? "none" : "transform .2s ease-out", touchAction: "pan-y" }}
        className={`group relative flex cursor-pointer select-none items-center gap-3 rounded-xl p-2 outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-accent ${active ? "bg-white/5" : ""}`}
      >
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
          <Cover id={song.id} url={song.cover_thumb} className="size-12" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            {playingNow ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-medium ${active ? "text-accent" : ""}`}>{song.title}</p>
          <p role="status" className={`text-sm ${note ? "truncate text-accent" : "break-words text-muted"}`}>
            {note ?? [song.artist, song.genres?.name].filter(Boolean).join(" · ")}
          </p>
          {song.plays > 0 && <p className="text-xs text-muted">{t.plays(song.plays)}</p>}
        </div>
        <SongMenu song={song} />
      </div>
    </li>
  );
}

export function SongList({ songs }: { songs: SongView[] }) {
  return (
    <ul className="space-y-1">
      {songs.map((s) => (
        <SongRow key={s.id} song={s} list={songs} />
      ))}
    </ul>
  );
}

export function SongCard({ song, list }: { song: SongView; list: SongView[] }) {
  const p = usePlayer();
  const active = p.current?.id === song.id;
  const t = useT();
  return (
    <div className="sw-fade w-40 shrink-0 sm:w-44">
      <button
        type="button"
        aria-label={t.song.playTitle(song.title)}
        onClick={() => (active ? p.toggle() : p.playQueue(list, song.id))}
        className="group relative block w-full overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Cover id={song.id} url={song.cover_thumb} className="w-full" />
        <span className="absolute bottom-2 right-2 flex size-10 translate-y-1 items-center justify-center rounded-full bg-accent opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
          {active && p.playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
        </span>
      </button>
      <p className={`mt-2 truncate text-sm font-medium ${active ? "text-accent" : ""}`}>{song.title}</p>
      <p className="break-words text-xs text-muted">{[song.artist, song.genres?.name].filter(Boolean).join(" · ")}</p>
      {song.plays > 0 && <p className="text-xs text-muted">{t.plays(song.plays)}</p>}
    </div>
  );
}

export function SongShelf({ title, songs }: { title: string; songs: SongView[] }) {
  if (!songs.length) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 px-1 text-lg font-semibold tracking-tight">{title}</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {songs.map((s) => (
          <SongCard key={s.id} song={s} list={songs} />
        ))}
      </div>
    </section>
  );
}
