"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus, Loader2, Music, Sparkles, UploadCloud, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { inputCls } from "@/components/AuthShell";
import { forgetLyrics } from "@/components/player/Lyrics";
import type { Genre, SongView } from "@/lib/types";
import { useT } from "@/components/I18n";
import type { Dict } from "@/lib/i18n";

const MAX_COVER = 5 * 1024 * 1024;

function uploadObject(
  bucket: string,
  path: string,
  file: File,
  token: string,
  onProgress: (f: number) => void,
  xhrRef: { current: XMLHttpRequest | null },
  t: Dict["upload"],
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = t.failedStatus(xhr.status);
      try {
        msg = JSON.parse(xhr.responseText).message ?? msg;
      } catch {}
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error(t.network));
    xhr.onabort = () => reject(new DOMException("Cancelled", "AbortError"));
    const fd = new FormData();
    fd.append("cacheControl", "3600");
    fd.append("", file);
    xhr.send(fd);
  });
}

/** 512 px list thumbnail (the original stays untouched for the full player). */
async function makeThumb(file: File) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  img.close();
  return new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.85));
}

async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const a = new Audio();
    const url = URL.createObjectURL(file);
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(a.duration) ? Math.round(a.duration) : null);
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    a.src = url;
  });
}

export function SongForm({
  genres, song, maxAudioMb, lyrics: initialLyrics = "",
}: { genres: Genre[]; song?: SongView; maxAudioMb: number; lyrics?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const editing = !!song;
  const T = useT();
  const t = T.upload;

  const [title, setTitle] = useState(song?.title ?? "");
  const [genreId, setGenreId] = useState(song?.genre_id ?? "");
  const [artist, setArtist] = useState(song?.artist ?? "");
  const [releaseDate, setReleaseDate] = useState(song?.release_date ?? "");
  const [lyrics, setLyrics] = useState(initialLyrics);

  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(song?.duration_seconds ?? null);
  const [hash, setHash] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(song?.cover_url ?? null);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [drag, setDrag] = useState(false);
  const [coverDrag, setCoverDrag] = useState(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const cancelled = useRef(false);
  // Genre guessed from the audio: an existing genre (pre-selected) or a new name to consider.
  const [suggest, setSuggest] = useState<"loading" | { name: string; genre?: Genre } | null>(null);
  const autoGenre = useRef("");
  const suggestRun = useRef(0);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function pickAudio(file: File | undefined) {
    if (!file) return;
    setError(null);
    setDuplicate(null);
    const okType = file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3");
    if (!okType) return setError(t.chooseMp3);
    if (file.size > maxAudioMb * 1024 * 1024) return setError(t.tooLarge(maxAudioMb));
    setAudio(file);
    setAudioUrl(URL.createObjectURL(file));
    if (!title) setTitle(file.name.replace(/\.mp3$/i, "").replace(/[_-]+/g, " ").trim());
    if (!editing) void runSuggest(file);
    setDuration(await readDuration(file));
    const h = await sha256(file);
    setHash(h);
    const { data } = await supabase.from("songs").select("title").eq("file_hash", h).limit(1);
    if (data?.length) setDuplicate(data[0].title);
  }

  async function runSuggest(file: File) {
    const run = ++suggestRun.current;
    setSuggest("loading");
    try {
      const { suggestGenres, matchGenre } = await import("@/lib/genreSuggest");
      const [top] = await suggestGenres(file);
      if (run !== suggestRun.current) return;
      if (!top) return setSuggest(null);
      const genre = matchGenre(top.name, genres);
      setSuggest({ name: genre?.name ?? top.name, genre });
      // Pre-select unless the admin already picked a genre themselves.
      if (genre) setGenreId((cur) => (!cur || cur === autoGenre.current ? (autoGenre.current = genre.id) : cur));
    } catch {
      if (run === suggestRun.current) setSuggest(null);
    }
  }

  function pickCover(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError(t.coverType);
    if (file.size > MAX_COVER) return setError(t.coverSize);
    setCover(file);
    setCoverUrl(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError(t.enterTitle);
    if (!genreId) return setError(t.chooseGenre);
    if (!editing && !audio) return setError(t.chooseAudio);

    setBusy(true);
    cancelled.current = false;
    const uploaded: { bucket: string; path: string }[] = [];
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error(t.sessionExpired);

      let audioPath = song?.audio_storage_path;
      let coverPath = song?.cover_storage_path ?? null;
      const staleFiles: { bucket: string; path: string }[] = [];

      if (audio) {
        setStage(t.stageAudio);
        const path = `${crypto.randomUUID()}.mp3`;
        await uploadObject("audio", path, audio, token, setProgress, xhrRef, t);
        uploaded.push({ bucket: "audio", path });
        if (song) staleFiles.push({ bucket: "audio", path: song.audio_storage_path });
        audioPath = path;
      }
      if (cover) {
        setStage(t.stageCover);
        setProgress(0);
        const ext = cover.type === "image/png" ? "png" : cover.type === "image/webp" ? "webp" : "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        await uploadObject("covers", path, cover, token, setProgress, xhrRef, t);
        uploaded.push({ bucket: "covers", path });
        // best effort: without a thumbnail the lists just use the original
        const thumb = await makeThumb(cover).catch(() => null);
        if (thumb && !(await supabase.storage.from("covers").upload(`thumbs/${path}`, thumb, { contentType: thumb.type })).error) {
          uploaded.push({ bucket: "covers", path: `thumbs/${path}` });
        }
        if (song?.cover_storage_path) {
          staleFiles.push({ bucket: "covers", path: song.cover_storage_path }, { bucket: "covers", path: `thumbs/${song.cover_storage_path}` });
        }
        coverPath = path;
      }

      setStage(t.stageSaving);
      const row = {
        title: title.trim(),
        genre_id: genreId,
        artist: artist.trim() || null,
        release_date: releaseDate || null,
        audio_storage_path: audioPath!,
        cover_storage_path: coverPath,
        ...(audio ? { duration_seconds: duration, file_hash: hash } : {}),
      };
      const res = song
        ? await supabase.from("songs").update(row).eq("id", song.id).select("id").single()
        : await supabase.from("songs").insert(row).select("id").single();
      if (res.error) throw new Error(res.error.message);

      const text = lyrics.trim();
      if (text !== initialLyrics.trim()) {
        const songId = res.data.id as string;
        const lr = text
          ? await supabase.from("song_lyrics").upsert({ song_id: songId, lyrics: text })
          : await supabase.from("song_lyrics").delete().eq("song_id", songId);
        if (lr.error) throw new Error(t.lyricsFailed(lr.error.message));
        forgetLyrics(songId);
      }

      for (const f of staleFiles) await supabase.storage.from(f.bucket).remove([f.path]);
      setDone(true);
      if (editing) router.refresh();
    } catch (err) {
      // never leave orphaned files behind
      for (const f of uploaded) await supabase.storage.from(f.bucket).remove([f.path]);
      if ((err as Error).name === "AbortError" || cancelled.current) setError(t.cancelled);
      else setError((err as Error).message);
    } finally {
      setBusy(false);
      setStage("");
      setProgress(0);
    }
  }

  function reset() {
    setTitle(""); setArtist(""); setReleaseDate(""); setLyrics(""); setAudio(null); setAudioUrl(null); setCover(null); setCoverUrl(null);
    setHash(null); setDuplicate(null); setDuration(null); setDone(false); setSuggest(null); setGenreId(""); autoGenre.current = "";
  }

  if (done && !editing) {
    return (
      <div className="sw-fade rounded-2xl border border-border bg-surface p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-400" />
        <h2 className="mt-4 text-xl font-semibold">{t.done}</h2>
        <p className="mt-1 text-sm text-muted">{t.doneBody}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white">{t.another}</button>
          <button onClick={() => router.push("/admin/songs")} className="rounded-xl border border-border px-4 py-2.5 text-sm">{t.viewSongs}</button>
        </div>
      </div>
    );
  }

  const label = "mb-1.5 block text-sm text-muted";

  return (
    <form onSubmit={submit} className="space-y-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void pickAudio(e.dataTransfer.files[0]); }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${drag ? "border-accent bg-accent/10" : "border-border"}`}
      >
        <UploadCloud className="mx-auto size-8 text-accent" />
        <p className="mt-2 text-sm">
          {audio ? audio.name : editing ? t.replaceAudio : t.drop}
        </p>
        <label className="mt-3 inline-block cursor-pointer rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-medium hover:bg-white/10">
          {t.chooseFile}
          <input type="file" accept="audio/mpeg,.mp3" className="sr-only" onChange={(e) => void pickAudio(e.target.files?.[0])} />
        </label>
        {audio && (
          <p className="mt-2 text-xs text-muted">
            {(audio.size / 1024 / 1024).toFixed(1)} MB{duration ? ` · ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}` : ""}
          </p>
        )}
        {audioUrl && <audio controls src={audioUrl} className="mx-auto mt-3 w-full max-w-sm" />}
        {duplicate && (
          <p role="alert" className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            {t.duplicate(duplicate)}
          </p>
        )}
      </div>

      <div className="flex gap-4">
        <label
          onDragOver={(e) => { e.preventDefault(); setCoverDrag(true); }}
          onDragLeave={() => setCoverDrag(false)}
          onDrop={(e) => { e.preventDefault(); setCoverDrag(false); pickCover(e.dataTransfer.files[0]); }}
          className={`relative flex size-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-surface-2 transition ${coverDrag ? "border-accent bg-accent/10" : "border-border"}`}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={t.coverPreview} className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center text-xs text-muted"><ImagePlus className="mb-1 size-6" />{t.dropCover}</span>
          )}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickCover(e.target.files?.[0])} />
        </label>
        <div className="min-w-0 flex-1">
          <label htmlFor="title" className={label}>{t.title}</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={inputCls} required />
          <label htmlFor="genre" className={`${label} mt-3`}>{t.genre}</label>
          <select id="genre" value={genreId} onChange={(e) => setGenreId(e.target.value)} className={inputCls} required>
            <option value="">{t.selectGenre}</option>
            {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {suggest === "loading" && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="size-3.5 animate-spin" /> {t.listening}
            </p>
          )}
          {suggest && suggest !== "loading" && (
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <Sparkles className="size-3.5 text-accent" />
              {suggest.genre ? (
                genreId === suggest.genre.id ? (
                  <>{t.suggestedFrom} <span className="text-foreground">{suggest.genre.name}</span></>
                ) : (
                  <button type="button" onClick={() => setGenreId(suggest.genre!.id)} className="text-accent hover:underline">
                    {t.suggestedUse(suggest.genre.name)}
                  </button>
                )
              ) : (
                <>{t.suggestedNew} <span className="text-foreground">{suggest.name}</span> {t.notInList}</>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="artist" className={label}>{t.artist}</label>
          <input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="date" className={label}>{t.releaseDate}</label>
          <input id="date" type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label htmlFor="lyrics" className="mb-1.5 block text-sm text-muted">{T.player.lyrics}</label>
        <textarea
          id="lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          rows={8}
          placeholder={t.lyricsPlaceholder}
          className={`${inputCls} font-mono text-sm leading-relaxed`}
        />
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {busy && (
        <div aria-live="polite">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{stage}…</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-gradient-to-r from-accent to-accent-2 transition-[width]" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Music className="size-4" />}
          {editing ? t.saveChanges : t.uploadSong}
        </button>
        {busy && (
          <button
            type="button"
            onClick={() => { cancelled.current = true; xhrRef.current?.abort(); }}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3"
          >
            <X className="size-4" /> {T.common.cancel}
          </button>
        )}
      </div>
      {done && editing && <p role="status" className="text-sm text-emerald-300">{t.saved}</p>}
    </form>
  );
}
