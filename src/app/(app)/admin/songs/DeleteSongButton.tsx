"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteSong } from "../actions";
import { useT } from "@/components/I18n";

type DeleteSongButtonProps = {
  id: string;
  title: string;
};

export function DeleteSongButton({ id, title }: DeleteSongButtonProps) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const t = useT().admin;
  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-label={t.deleteTitle(title)}
        onClick={() => {
          if (!confirm(t.confirmDeleteSong(title))) return;
          start(async () => {
            const r = await deleteSong(id);
            if (!r.ok) setErr(r.error ?? t.deleteFailed);
            else if (r.message) alert(r.message);
          });
        }}
        className="flex size-10 items-center justify-center rounded-lg border border-border text-red-300 hover:border-red-400 disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>
      {err && <span role="alert" className="sr-only">{err}</span>}
    </>
  );
}
