"use client";

import { useState } from "react";
import { Cast } from "lucide-react";
import { usePlayer } from "./PlayerProvider";
import type { CastNote } from "@/i18n/dictionary";
import { useT } from "@/components/I18n";

/** Cast to a TV/speaker (Chromecast or AirPlay); hidden where the browser can't cast. */
export function CastButton({ className = "" }: { className?: string }) {
  const p = usePlayer();
  const [note, setNote] = useState<CastNote | null>(null);
  const t = useT().player;
  if (!p.castSupported) return null;
  return (
    <span className="relative">
      <button
        type="button"
        aria-label={p.casting ? t.castChange : t.castTo}
        title={p.casting ? t.casting : t.cast}
        onClick={async () => {
          const msg = await p.cast();
          if (!msg) return;
          setNote(msg);
          setTimeout(() => setNote(null), 2500);
        }}
        className={`flex size-11 items-center justify-center rounded-full transition hover:bg-white/5 ${p.casting ? "text-accent" : "text-muted hover:text-foreground"} ${className}`}
      >
        <Cast className="size-5" />
      </button>
      {note && (
        <span role="status" className="sw-fade absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-xl shadow-black/50">
          {t.castNotes[note]}
        </span>
      )}
    </span>
  );
}
