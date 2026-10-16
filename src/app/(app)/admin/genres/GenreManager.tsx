"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { createGenre, deleteGenre, renameGenre } from "../actions";
import { inputCls } from "@/components/AuthShell";
import { useT } from "@/components/I18n";

type G = { id: string; name: string; count: number };

function Row({ g, onError }: { g: G; onError: (m: string | null) => void }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(g.name);
  const [pending, start] = useTransition();
  const T = useT();
  const t = T.admin;
  return (
    <li className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2 pl-4">
      {edit ? (
        <input value={name} onChange={(e) => setName(e.target.value)} aria-label={t.genreName} className={`${inputCls} py-2`} autoFocus />
      ) : (
        <span className="min-w-0 flex-1 truncate">
          {g.name} <span className="text-xs text-muted">· {T.songs(g.count)}</span>
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        aria-label={edit ? t.saveName : t.renameGenre(g.name)}
        onClick={() =>
          edit
            ? start(async () => {
                const r = await renameGenre(g.id, name);
                onError(r.ok ? null : (r.error ?? t.failed));
                if (r.ok) setEdit(false);
              })
            : setEdit(true)
        }
        className="flex size-10 items-center justify-center rounded-lg hover:bg-white/5"
      >
        {edit ? <Check className="size-4" /> : <Pencil className="size-4" />}
      </button>
      <button
        type="button"
        disabled={pending}
        aria-label={t.deleteGenre(g.name)}
        onClick={() => {
          if (!confirm(t.confirmDeleteGenre(g.name))) return;
          start(async () => {
            const r = await deleteGenre(g.id);
            onError(r.ok ? null : (r.error ?? t.failed));
          });
        }}
        className="flex size-10 items-center justify-center rounded-lg text-red-300 hover:bg-white/5"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

export function GenreManager({ genres }: { genres: G[] }) {
  const [state, action, pending] = useActionState(createGenre, undefined);
  const [err, setErr] = useState<string | null>(null);
  const t = useT().admin;
  return (
    <div className="space-y-4">
      <form action={action} className="flex gap-2">
        <input name="name" placeholder={t.newGenre} aria-label={t.newGenreName} maxLength={60} className={inputCls} />
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-white disabled:opacity-50">
          <Plus className="size-4" /> {t.add}
        </button>
      </form>
      {(err || (state && !state.ok)) && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{err ?? state?.error}</p>
      )}
      <ul className="space-y-2">
        {genres.map((g) => <Row key={g.id + g.name} g={g} onError={setErr} />)}
      </ul>
    </div>
  );
}
