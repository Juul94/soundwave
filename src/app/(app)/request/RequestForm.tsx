"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { VIBES, VOICES, type Voice } from "@/lib/requests";
import { useT } from "@/components/I18n";

const field = "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-base outline-none focus:border-accent";
const label = "mb-1.5 block text-sm font-medium";

export function RequestForm() {
  const t = useT();
  const [title, setTitle] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [voice, setVoice] = useState<Voice>("any");
  const [notes, setNotes] = useState("");
  const [ownLyrics, setOwnLyrics] = useState(false);
  const [lyrics, setLyrics] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const reset = () => {
    setTitle("");
    setMoods([]);
    setVoice("any");
    setNotes("");
    setOwnLyrics(false);
    setLyrics("");
    setDescription("");
    setSent(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError(t.request.errTitle);
    if (ownLyrics && !lyrics.trim()) return setError(t.request.errLyrics);
    if (!ownLyrics && !description.trim()) return setError(t.request.errDescription);
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("song_requests").insert({
      title: title.trim(),
      moods,
      voice,
      style_notes: notes.trim() || null,
      lyrics: ownLyrics ? lyrics.trim() : null,
      description: ownLyrics ? null : description.trim(),
    });
    setBusy(false);
    if (error) return setError(t.request.errSend);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="sw-fade flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center">
        <CheckCircle2 className="size-12 text-accent" />
        <h2 className="mt-4 text-lg font-medium">{t.request.sent}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">{t.request.thanks(title.trim())}</p>
        <button type="button" onClick={reset} className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white">
          {t.request.another}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-6">
      <div>
        <label htmlFor="rq-title" className={label}>{t.request.songTitle}</label>
        <input id="rq-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder={t.request.titlePlaceholder} className={field} />
      </div>

      <fieldset>
        <legend className={label}>{t.request.vibe} <span className="font-normal text-muted">{t.request.pickMany}</span></legend>
        <div className="flex flex-wrap gap-2">
          {VIBES.map((v) => {
            const on = moods.includes(v);
            return (
              <button
                key={v}
                type="button"
                aria-pressed={on}
                onClick={() => setMoods(on ? moods.filter((m) => m !== v) : [...moods, v])}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-accent bg-accent/15 text-foreground" : "border-border bg-surface text-muted hover:text-foreground"}`}
              >
                {t.vibes[v] ?? v}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className={label}>{t.request.whoSings}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VOICES.map((v) => (
            <button
              key={v.value}
              type="button"
              aria-pressed={voice === v.value}
              onClick={() => setVoice(v.value)}
              className={`rounded-xl border px-3 py-2.5 text-sm transition ${voice === v.value ? "border-accent bg-accent/15 text-foreground" : "border-border bg-surface text-muted hover:text-foreground"}`}
            >
              {t.voices[v.value]}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="rq-notes" className={label}>{t.request.styleNotes} <span className="font-normal text-muted">{t.common.optional}</span></label>
        <textarea id="rq-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={3} placeholder={t.request.stylePlaceholder} className={field} />
      </div>

      <div>
        <button
          type="button"
          role="switch"
          aria-checked={ownLyrics}
          onClick={() => setOwnLyrics((v) => !v)}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 text-left"
        >
          <span>
            <span className="block text-sm font-medium">{t.request.ownLyrics}</span>
            <span className="block text-xs text-muted">{ownLyrics ? t.request.ownLyricsOn : t.request.ownLyricsOff}</span>
          </span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${ownLyrics ? "bg-accent" : "bg-white/15"}`}>
            <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${ownLyrics ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </button>
        {ownLyrics && (
          <textarea
            aria-label={t.request.yourLyrics}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            maxLength={10000}
            rows={10}
            placeholder={t.request.lyricsPlaceholder}
            className={`${field} mt-3`}
          />
        )}
        {!ownLyrics && (
          <div className="mt-3">
            <label htmlFor="rq-desc" className={label}>
              {t.request.describe}
              <span className="block text-xs font-normal text-muted">{t.request.describeHelp}</span>
            </label>
            <textarea
              id="rq-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={3000}
              rows={6}
              placeholder={t.request.describePlaceholder}
              className={field}
            />
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />} {t.request.send}
      </button>
    </form>
  );
}
