"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SongView } from "@/lib/types";
import type { CastNote, PlayerError } from "@/lib/i18n";
import {
  castActive, castHasMedia, castLoad, castRequest, castSeek, castTime, castToggle, loadCastSdk, watchCast, type CastEvents,
} from "@/lib/cast";

export type Repeat = "off" | "all" | "one";

type PlayerCtx = {
  current: SongView | null;
  queue: SongView[];
  order: string[];
  playing: boolean;
  loading: boolean;
  error: PlayerError | null;
  time: number;
  duration: number;
  shuffle: boolean;
  repeat: Repeat;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  playQueue: (songs: SongView[], startId?: string, opts?: { shuffle?: boolean }) => void;
  playNext: (song: SongView) => void;
  playFromQueue: (id: string) => void;
  moveInQueue: (id: string, to: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  retry: () => void;
  /** Chromecast (Remote Playback API) or AirPlay is available in this browser. */
  castSupported: boolean;
  casting: boolean;
  /** Opens the device picker; returns a message to show, or null. */
  cast: () => Promise<CastNote | null>;
};

type AirPlayAudio = HTMLAudioElement & {
  webkitShowPlaybackTargetPicker?: () => void;
  webkitCurrentPlaybackTargetIsWireless?: boolean;
};

const Ctx = createContext<PlayerCtx | null>(null);
export const usePlayer = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer outside PlayerProvider");
  return c;
};

const URL_TTL = 3600;

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function PlayerProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlCache = useRef(new Map<string, { url: string; exp: number }>());
  const loadToken = useRef(0);
  const retriedRef = useRef(false);
  const resumeAt = useRef<number | null>(null); // where to continue locally after casting stops

  const [queue, setQueue] = useState<SongView[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PlayerError | null>(null);
  const [time, setTime] = useState(0);
  // play counting: a play counts once 30 s have actually been listened to
  const listen = useRef({ secs: 0, last: 0, counted: false });
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("off");
  const [expanded, setExpanded] = useState(false);
  const [castSupported, setCastSupported] = useState(false);
  const [casting, setCasting] = useState(false);
  const [castSdk, setCastSdk] = useState(false);

  const byId = useMemo(() => new Map(queue.map((s) => [s.id, s])), [queue]);
  const current = currentId ? (byId.get(currentId) ?? null) : null;

  const getUrl = useCallback(
    async (path: string, force = false) => {
      const hit = urlCache.current.get(path);
      if (!force && hit && hit.exp > Date.now() + 60_000) return hit.url;
      const { data, error } = await supabase.storage.from("audio").createSignedUrl(path, URL_TTL);
      if (error || !data) throw new Error(error?.message ?? "Could not get audio URL");
      urlCache.current.set(path, { url: data.signedUrl, exp: Date.now() + URL_TTL * 1000 });
      return data.signedUrl;
    },
    [supabase],
  );

  const load = useCallback(
    async (song: SongView, opts?: { resumeAt?: number; forceUrl?: boolean }) => {
      const audio = audioRef.current;
      if (!audio) return;
      const token = ++loadToken.current;
      setLoading(true);
      setError(null);
      try {
        const url = await getUrl(song.audio_storage_path, opts?.forceUrl);
        if (token !== loadToken.current) return;
        if (castActive()) {
          audio.pause();
          // the TV has no login cookie, so it gets a short-lived signed cover link
          const cover = song.cover_storage_path
            ? (await supabase.storage.from("covers").createSignedUrl(song.cover_storage_path, 3600)).data?.signedUrl ?? null
            : null;
          if (!(await castLoad(song, url, opts?.resumeAt, cover)) && token === loadToken.current) {
            setError("tv");
          }
          return;
        }
        resumeAt.current = null;
        audio.src = url;
        if (opts?.resumeAt) audio.currentTime = opts.resumeAt;
        await audio.play();
      } catch (e) {
        if (token !== loadToken.current) return;
        const name = (e as Error).name;
        if (name === "NotAllowedError") {
          setPlaying(false); // browser needs another tap
        } else if (name !== "AbortError") {
          setError("connection");
        }
      } finally {
        if (token === loadToken.current) setLoading(false);
      }
    },
    [getUrl, supabase],
  );

  const startSong = useCallback(
    (id: string, list: SongView[]) => {
      const song = list.find((s) => s.id === id);
      if (!song) return;
      retriedRef.current = false;
      listen.current = { secs: 0, last: 0, counted: false };
      setCurrentId(id);
      setTime(0);
      setDuration(song.duration_seconds ?? 0);
      void load(song);
      void supabase
        .from("recently_played")
        .upsert({ user_id: userId, song_id: id, played_at: new Date().toISOString() }, { onConflict: "user_id,song_id" })
        .then(() => {});
    },
    [load, supabase, userId],
  );

  const playQueue = useCallback<PlayerCtx["playQueue"]>(
    (songs, startId, opts) => {
      if (!songs.length) return;
      const useShuffle = opts?.shuffle ?? shuffle;
      const first = startId ?? (useShuffle ? songs[Math.floor(Math.random() * songs.length)].id : songs[0].id);
      setQueue(songs);
      setShuffle(useShuffle);
      setOrder(
        useShuffle ? [first, ...shuffled(songs.filter((s) => s.id !== first).map((s) => s.id))] : songs.map((s) => s.id),
      );
      startSong(first, songs);
    },
    [shuffle, startSong],
  );

  // Puts a song right after the current one; starts it if nothing is playing.
  const playNext = useCallback<PlayerCtx["playNext"]>(
    (song) => {
      if (!currentId) return playQueue([song], song.id);
      if (song.id === currentId) return;
      setQueue((q) => (q.some((s) => s.id === song.id) ? q : [...q, song]));
      setOrder((o) => {
        const rest = o.filter((id) => id !== song.id);
        const i = rest.indexOf(currentId);
        return [...rest.slice(0, i + 1), song.id, ...rest.slice(i + 1)];
      });
    },
    [currentId, playQueue],
  );

  // Jump within the current queue without rebuilding its order.
  const playFromQueue = useCallback((id: string) => startSong(id, queue), [queue, startSong]);
  const moveInQueue = useCallback((id: string, to: number) => {
    setOrder((o) => {
      const rest = o.filter((x) => x !== id);
      rest.splice(Math.max(0, Math.min(rest.length, to)), 0, id);
      return rest;
    });
  }, []);

  const goTo = useCallback(
    (dir: 1 | -1, auto = false) => {
      if (!currentId || !order.length) return;
      const i = order.indexOf(currentId);
      let n = i + dir;
      if (n >= order.length || n < 0) {
        if (auto && repeat === "off" && dir === 1) {
          setPlaying(false);
          setTime(0);
          return;
        }
        if (repeat === "off" && !auto && dir === 1) return;
        n = (n + order.length) % order.length;
        if (dir === 1 && shuffle && order.length > 1) {
          const reshuffled = shuffled(order);
          setOrder(reshuffled);
          startSong(reshuffled[0], queue);
          return;
        }
      }
      startSong(order[n], queue);
    },
    [currentId, order, queue, repeat, shuffle, startSong],
  );

  const next = useCallback(() => goTo(1), [goTo]);
  const prev = useCallback(() => {
    const a = audioRef.current;
    if (castActive() && castTime() > 3) return castSeek(0);
    if (!castActive() && a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    goTo(-1);
  }, [goTo]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (castActive()) {
      if (castHasMedia() && !error) castToggle();
      else void load(current, { resumeAt: time });
      return;
    }
    if (!a.src || error) {
      void load(current, { resumeAt: resumeAt.current ?? a.currentTime });
      return;
    }
    if (a.paused) void a.play().catch(() => setPlaying(false));
    else a.pause();
  }, [current, error, load, time]);

  const seek = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(t)) return;
    if (castActive()) castSeek(t);
    else a.currentTime = t;
    setTime(t);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((on) => {
      const nowOn = !on;
      setOrder(
        nowOn
          ? [...(currentId ? [currentId] : []), ...shuffled(queue.filter((s) => s.id !== currentId).map((s) => s.id))]
          : queue.map((s) => s.id),
      );
      return nowOn;
    });
  }, [currentId, queue]);

  const cycleRepeat = useCallback(() => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")), []);

  const retry = useCallback(() => {
    const a = audioRef.current;
    if (current) void load(current, { resumeAt: castActive() ? time : (a?.currentTime ?? 0), forceUrl: true });
  }, [current, load, time]);

  const cast = useCallback(async (): Promise<CastNote | null> => {
    if (castSdk) return castRequest();
    const a = audioRef.current as AirPlayAudio | null;
    if (!a) return null;
    if (!current || !a.src) return "noSong";
    if (a.webkitShowPlaybackTargetPicker && !a.remote) {
      a.webkitShowPlaybackTargetPicker();
      return null;
    }
    try {
      await a.remote.prompt();
      return null;
    } catch (e) {
      const name = (e as Error).name;
      if (name === "NotFoundError") return "noDevices";
      if (name === "NotSupportedError") return "unsupported";
      return null; // picker closed
    }
  }, [current, castSdk]);

  // Google Cast: TV shows cover, title and artist. Handlers read fresh state through this ref.
  const castEvents = useRef<CastEvents>(null!);
  useEffect(() => {
    castEvents.current = {
      onConnect: () => {
        const a = audioRef.current;
        setCasting(true);
        if (current) void load(current, { resumeAt: a && a.src ? a.currentTime : (resumeAt.current ?? time) });
      },
      onDisconnect: (last) => {
        const a = audioRef.current;
        setCasting(false);
        setPlaying(false);
        setLoading(false);
        resumeAt.current = last;
        setTime(last);
        if (a) {
          a.pause();
          a.removeAttribute("src"); // reloaded at `last` on the next play
          a.load();
        }
      },
      onState: (st) => {
        setPlaying(!st.paused);
        setTime(st.time);
        if (st.duration > 0) setDuration(st.duration);
        setLoading(st.buffering);
      },
      onEnded: () => {
        if (repeat === "one" && current) void load(current);
        else goTo(1, true);
      },
    };
  });
  useEffect(() => {
    let stop: (() => void) | undefined;
    let alive = true;
    void loadCastSdk().then((ok) => {
      if (!ok || !alive) return;
      setCastSdk(true);
      setCastSupported(true);
      stop = watchCast(castEvents);
    });
    return () => {
      alive = false;
      stop?.();
    };
  }, []);

  // Fallback without the Cast SDK: Remote Playback API / AirPlay
  useEffect(() => {
    const a = audioRef.current as AirPlayAudio | null;
    if (!a || castSdk) return;
    if (a.remote) {
      const remote = a.remote;
      const sync = () => setCasting(remote.state !== "disconnected");
      remote.onconnecting = sync;
      remote.onconnect = sync;
      remote.ondisconnect = sync;
      setCastSupported(true);
      return () => {
        remote.onconnecting = remote.onconnect = remote.ondisconnect = null;
      };
    }
    if (a.webkitShowPlaybackTargetPicker) {
      const sync = () => setCasting(!!a.webkitCurrentPlaybackTargetIsWireless);
      a.addEventListener("webkitcurrentplaybacktargetiswirelesschanged", sync);
      setCastSupported(true);
      return () => a.removeEventListener("webkitcurrentplaybacktargetiswirelesschanged", sync);
    }
  }, [castSdk]);

  // audio element events
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => Number.isFinite(a.duration) && setDuration(a.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onErr = () => {
      // signed URL likely expired: refresh once and resume
      if (current && !retriedRef.current) {
        retriedRef.current = true;
        void load(current, { resumeAt: a.currentTime, forceUrl: true });
      } else {
        setPlaying(false);
        setLoading(false);
        setError("failed");
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("playing", onCanPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("error", onErr);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("playing", onCanPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("error", onErr);
    };
  }, [current, load]);

  useEffect(() => {
    const l = listen.current;
    // jumped back to the start after counting (replay / repeat one) -> new play
    if (l.counted && time < 1 && l.last > 5) {
      l.secs = 0;
      l.counted = false;
    }
    const d = time - l.last;
    if (playing && d > 0 && d < 2) l.secs += d;
    l.last = time;
    if (!l.counted && currentId && l.secs >= Math.min(30, (duration || 60) * 0.9)) {
      l.counted = true;
      void supabase.rpc("count_play", { p_song: currentId }).then(() => {});
    }
  }, [time, playing, duration, currentId, supabase]);

  // ended -> repeat/advance (re-bound so it always sees fresh state)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => {
      if (repeat === "one") {
        a.currentTime = 0;
        void a.play();
      } else goTo(1, true);
    };
    a.addEventListener("ended", onEnded);
    return () => a.removeEventListener("ended", onEnded);
  }, [goTo, repeat]);

  // Media Session
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!current) return;
    ms.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist ?? "Soundwave",
      album: current.album ?? current.genres?.name ?? "Soundwave",
      artwork: current.cover_url ? [{ src: current.cover_url, sizes: "512x512" }] : [],
    });
  }, [current]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(a, h);
      } catch {}
    };
    set("play", () => toggle());
    set("pause", () => toggle());
    set("previoustrack", () => prev());
    set("nexttrack", () => next());
    set("seekto", (d) => d.seekTime != null && seek(d.seekTime));
    return () => ["play", "pause", "previoustrack", "nexttrack", "seekto"].forEach((a) => set(a as MediaSessionAction, null));
  }, [toggle, prev, next, seek]);

  useEffect(() => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [playing]);

  const value: PlayerCtx = {
    current, queue, order, playing, loading, error, time, duration, shuffle, repeat, expanded,
    setExpanded, playQueue, playNext, playFromQueue, moveInQueue, toggle, next, prev, seek, toggleShuffle, cycleRepeat, retry,
    castSupported, casting, cast,
  };

  return (
    <Ctx.Provider value={value}>
      <audio ref={audioRef} preload="none" playsInline />
      {children}
    </Ctx.Provider>
  );
}
