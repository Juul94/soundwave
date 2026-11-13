"use client";

import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { ChevronDown, Loader2, RotateCcw, Search, Shuffle } from "lucide-react";
import { usePlayer } from "@/components/player/PlayerProvider";
import type { Genre, SongView } from "@/types";
import { useT } from "@/components/I18n";

export function BrowseControls({
  genres, songs, q, genre, sort, children,
}: { genres: Genre[]; songs: SongView[]; q: string; genre: string; sort: "new" | "az" | "plays"; children: React.ReactNode }) {
  const router = useRouter();
  const p = usePlayer();
  const tr = useT();
  const [text, setText] = useState(q);
  const [pending, start] = useTransition();
  const [optGenre, setOptGenre] = useOptimistic(genre);
  const [optSort, setOptSort] = useOptimistic(sort);

  const go = (next: { q?: string; genre?: string; sort?: string }) => {
    const sp = new URLSearchParams();
    const v = { q: text, genre, sort, ...next };
    if (v.q) sp.set("q", v.q);
    if (v.genre) sp.set("genre", v.genre);
    if (v.sort && v.sort !== "new") sp.set("sort", v.sort);
    start(() => {
      if (next.genre !== undefined) setOptGenre(next.genre);
      if (next.sort !== undefined) setOptSort(next.sort as "new" | "az" | "plays");
      router.replace(`/${sp.size ? `?${sp}` : ""}`);
    });
  };

  useEffect(() => {
    if (text === q) return;
    const t = setTimeout(() => go({ q: text }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm transition ${
      active ? "border-accent bg-accent/15 text-foreground" : "border-border bg-surface text-muted hover:text-foreground"
    }`;

  return (
    <>
    <div className="relative mb-6 space-y-3" aria-busy={pending}>
      <div className={`absolute -top-3 inset-x-0 h-0.5 overflow-hidden rounded bg-border transition-opacity ${pending ? "opacity-100" : "opacity-0"}`}>
        <div className="h-full w-1/3 animate-pulse bg-accent" />
      </div>
      <form
        role="search"
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur(); // closes the mobile keyboard
          if (text !== q) go({ q: text });
        }}
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tr.browse.searchPlaceholder}
          aria-label={tr.browse.searchSongs}
          className="w-full rounded-xl border border-border bg-surface py-3 pl-12 pr-4 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </form>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <button type="button" className={chip(!optGenre)} onClick={() => go({ genre: "" })}>{tr.common.all}</button>
        {genres.map((g) => (
          <button key={g.id} type="button" className={chip(optGenre === g.slug)} onClick={() => go({ genre: g.slug })}>
            {g.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            aria-label={tr.common.sort}
            value={optSort}
            onChange={(e) => go({ sort: e.target.value })}
            className="appearance-none rounded-xl border border-border bg-surface py-2 pl-3 pr-9 text-sm outline-none focus:border-accent"
          >
            <option value="new">{tr.common.newest}</option>
            <option value="az">{tr.common.az}</option>
            <option value="plays">{tr.common.mostPlayed}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        </div>
        <button
          type="button"
          disabled={!songs.length}
          onClick={() => p.playQueue(songs, undefined, { shuffle: true })}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          <Shuffle className="size-4" /> {tr.common.shuffle}
        </button>
        {(q || genre || sort !== "new") && (
          <button
            type="button"
            onClick={() => {
              setText("");
              router.replace("/");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            <RotateCcw className="size-4" /> {tr.common.reset}
          </button>
        )}
      </div>
    </div>
    {pending ? (
      <div role="status" aria-label={tr.common.loading} className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-accent" />
      </div>
    ) : (
      children
    )}
    </>
  );
}
