"use client";

import { Fragment, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { Cover } from "@/components/Cover";
import type { SongView } from "@/types";
import { usePlayer } from "./PlayerProvider";
import { useT } from "@/components/I18n";

/** Now playing on top, then what plays next; tap to play, drag the handle to reorder. */
export function QueueList() {
  const p = usePlayer();
  const t = useT().player;
  // Songs before the current one have already played, so they are hidden.
  const start = Math.max(0, p.order.indexOf(p.current?.id ?? ""));
  const items = p.order.slice(start).map((id) => p.queue.find((q) => q.id === id)).filter(Boolean) as SongView[];
  const [drag, setDrag] = useState<{ id: string; from: number; dy: number; h: number } | null>(null);
  const startY = useRef(0);

  const to = drag ? Math.max(1, Math.min(items.length - 1, drag.from + Math.round(drag.dy / drag.h))) : -1;
  const shift = (i: number) => {
    if (!drag) return 0;
    if (i === drag.from) return drag.dy;
    if (drag.from < to && i > drag.from && i <= to) return -drag.h;
    if (drag.from > to && i >= to && i < drag.from) return drag.h;
    return 0;
  };

  return (
    <ul className="mt-4 flex-1 space-y-1 overflow-y-auto">
      {items.map((q, i) => {
        const now = q.id === p.current?.id;
        const moving = drag?.id === q.id;
        return (
          <Fragment key={q.id}>
          {i < 2 && (
            <li aria-hidden="true" className="px-2 pb-1 pt-3 text-xs font-medium uppercase tracking-widest text-muted">{i === 0 ? t.nowPlaying : t.nextUp}</li>
          )}
          <li
            style={{ transform: `translateY(${shift(i)}px)`, transition: moving ? "none" : "transform .15s ease-out" }}
            className={`relative flex items-center rounded-xl ${moving ? "z-10 bg-surface shadow-xl shadow-black/50" : ""} ${now ? "bg-white/5" : ""}`}
          >
            <button
              type="button"
              onClick={() => p.playFromQueue(q.id)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5"
            >
              {i > 0 && <span className="w-5 text-center text-xs text-muted">{i}</span>}
              <Cover id={q.id} url={q.cover_thumb} className="size-10 rounded-md" />
              <span className="min-w-0">
                <span className={`block truncate text-sm ${now ? "text-accent" : ""}`}>{q.title}</span>
                <span className="block truncate text-xs text-muted">{q.artist ?? q.genres?.name}</span>
              </span>
            </button>
            {i > 0 && <span
              role="button"
              aria-label={t.reorder(q.title)}
              style={{ touchAction: "none" }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                startY.current = e.clientY;
                // row height plus the 4px list gap
                const h = (e.currentTarget.parentElement?.offsetHeight ?? 56) + 4;
                setDrag({ id: q.id, from: i, dy: 0, h });
              }}
              onPointerMove={(e) => drag?.id === q.id && setDrag({ ...drag, dy: e.clientY - startY.current })}
              onPointerUp={() => {
                if (drag && to !== drag.from) p.moveInQueue(drag.id, start + to);
                setDrag(null);
              }}
              onPointerCancel={() => setDrag(null)}
              className="flex size-11 shrink-0 cursor-grab items-center justify-center text-muted active:cursor-grabbing"
            >
              <GripVertical className="size-5" />
            </span>}
          </li>
          </Fragment>
        );
      })}
    </ul>
  );
}
