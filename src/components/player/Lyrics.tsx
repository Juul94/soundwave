"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseLyrics } from "@/utils/lyrics";
import type { LyricLine } from "@/types";
import { useT } from "@/components/I18n";

const cache = new Map<string, LyricLine[]>();
export const forgetLyrics = (songId: string) => cache.delete(songId);

/** Lyrics for the current song. Mount with key={songId}. */
export function LyricsPanel({ songId }: { songId: string }) {
  const [lines, setLines] = useState<LyricLine[] | undefined>(() => cache.get(songId));
  const t = useT().player;

  useEffect(() => {
    if (cache.has(songId)) return;
    let live = true;
    createClient()
      .from("song_lyrics")
      .select("lyrics")
      .eq("song_id", songId)
      .maybeSingle()
      .then(({ data, error }) => {
        const l = data ? parseLyrics(data.lyrics as string) : [];
        if (!error) cache.set(songId, l);
        if (live) setLines(l);
      });
    return () => {
      live = false;
    };
  }, [songId]);

  if (!lines) {
    return (
      <div className="mt-6 flex flex-1 items-center justify-center text-muted">
        <Loader2 className="size-6 animate-spin" aria-label={t.loadingLyrics} />
      </div>
    );
  }
  if (!lines.length) {
    return <p className="mt-6 flex flex-1 items-center justify-center text-center text-muted">{t.noLyrics}</p>;
  }

  return (
    <div className="relative mt-2 h-0 min-h-32 flex-1 overflow-y-auto pb-16 pt-10 [mask-image:linear-gradient(transparent,black_8%,black_92%,transparent)] [scrollbar-width:none]">
      {lines.map((l, i) => (
        <p key={i} className={`py-1 text-xl font-semibold leading-snug text-foreground/90 ${l.gap ? "mt-6" : ""}`}>
          {l.text}
        </p>
      ))}
    </div>
  );
}
