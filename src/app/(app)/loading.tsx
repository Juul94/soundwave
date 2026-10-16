"use client";

import { useT } from "@/components/I18n";

export default function Loading() {
  const t = useT();
  return (
    <div className="animate-pulse" aria-busy="true" aria-label={t.common.loading}>
      <div className="mb-2 h-8 w-40 rounded-lg bg-surface-2" />
      <div className="mb-6 h-4 w-24 rounded bg-surface" />
      <div className="mb-6 h-12 w-full rounded-xl bg-surface" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="size-12 shrink-0 rounded-lg bg-surface-2" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded bg-surface-2" />
              <div className="h-3 w-1/3 rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
