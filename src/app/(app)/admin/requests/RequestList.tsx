"use client";

import { useState } from "react";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SongRequest } from "@/lib/requests";
import { useT } from "@/components/I18n";
import { requestsChanged } from "@/components/RequestCount";

export function RequestList({ initial }: { initial: SongRequest[] }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const sb = createClient();
  const T = useT();
  const t = T.admin;

  const setStatus = async (r: SongRequest, status: SongRequest["status"]) => {
    const { error } = await sb.from("song_requests").update({ status }).eq("id", r.id);
    if (error) return setError(t.reqUpdateFailed);
    setItems((list) => list.map((x) => (x.id === r.id ? { ...x, status } : x)));
    requestsChanged();
  };
  const remove = async (r: SongRequest) => {
    if (!confirm(t.confirmDeleteRequest(r.title))) return;
    const { error } = await sb.from("song_requests").delete().eq("id", r.id);
    if (error) return setError(t.reqDeleteFailed);
    setItems((list) => list.filter((x) => x.id !== r.id));
    requestsChanged();
  };

  if (!items.length) {
    return <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">{t.noRequests}</p>;
  }

  // New requests first, each group newest first.
  const sorted = [...items].sort((a, b) => (a.status === b.status ? 0 : a.status === "new" ? -1 : 1));

  return (
    <>
      {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}
      <ul className="space-y-3">
        {sorted.map((r) => (
          <li key={r.id} className={`rounded-2xl border bg-surface p-4 ${r.status === "new" ? "border-accent/50" : "border-border opacity-70"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2">
                  <span className="truncate font-medium">{r.title}</span>
                  {r.status === "new" && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase text-white">{t.new}</span>}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {r.profiles?.display_name ?? r.profiles?.email ?? t.unknown} · {new Date(r.created_at).toLocaleString(T.locale)}
                </p>
              </div>
              <div className="flex shrink-0">
                <button
                  type="button"
                  aria-label={r.status === "new" ? t.markDone : t.markNew}
                  title={r.status === "new" ? t.markDone : t.markNew}
                  onClick={() => setStatus(r, r.status === "new" ? "done" : "new")}
                  className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground"
                >
                  {r.status === "new" ? <Check className="size-5" /> : <RotateCcw className="size-5" />}
                </button>
                <button
                  type="button"
                  aria-label={t.deleteRequest}
                  onClick={() => remove(r)}
                  className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-red-300"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
            </div>

            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-muted">{t.voice}</dt>
                <dd>{T.voices[r.voice] ?? r.voice}</dd>
              </div>
              {r.moods.length > 0 && (
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-muted">{t.vibe}</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {r.moods.map((m) => (
                      <span key={m} className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs">{T.vibes[m] ?? m}</span>
                    ))}
                  </dd>
                </div>
              )}
              {r.style_notes && (
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-muted">{t.notes}</dt>
                  <dd className="whitespace-pre-wrap">{r.style_notes}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-muted">{t.lyrics}</dt>
                <dd className="min-w-0 flex-1">
                  {r.lyrics ? (
                    <details>
                      <summary className="cursor-pointer text-accent">{t.theirLyrics}</summary>
                      <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-sans text-sm">{r.lyrics}</pre>
                    </details>
                  ) : (
                    <>
                      <span className="text-muted">{t.writeForMe}</span>
                      <p className="mt-1 whitespace-pre-wrap">{r.description}</p>
                    </>
                  )}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
