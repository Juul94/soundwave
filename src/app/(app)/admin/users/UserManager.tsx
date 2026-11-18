"use client";

import { useActionState, useState, useTransition } from "react";
import { Mail, Search, Send, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX } from "lucide-react";
import { inviteUser, removeUser, resendInvite, setUserActive, setUserRole } from "../actions";
import { inputCls } from "@/components/AuthShell";
import { useT } from "@/components/I18n";

type Row = { id: string; email: string; name: string; role: "admin" | "user"; active: boolean; pending: boolean; isSelf: boolean; lastSeen: string | null; lastHeard: string | null };

const p2 = (n: number) => String(n).padStart(2, "0");
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

type UserRowProps = {
  r: Row;
  onError: (m: string | null) => void;
  onMessage: (m: string | null) => void;
};

function UserRow({ r, onError, onMessage }: UserRowProps) {
  const [pending, start] = useTransition();
  const T = useT();
  const t = T.admin;
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const res = await fn();
      onError(res.ok ? null : (res.error ?? t.actionFailed));
      onMessage(res.ok ? (res.message ?? null) : null);
    });
  const btn = "flex size-10 items-center justify-center rounded-lg border border-border hover:border-accent disabled:opacity-40";
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{r.name || r.email}{r.isSelf && <span className="text-muted"> {t.you}</span>}</p>
        <p className="truncate text-xs text-muted">{r.email}</p>
        <p className="text-xs text-muted">{t.lastOnline}: {r.lastSeen ? fmtDate(r.lastSeen) : t.never}</p>
        <p className="truncate text-xs text-muted">{t.lastHeard}: {r.lastHeard ?? t.never}</p>
        <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">{T.roles[r.role] ?? r.role}</span>
          <span className={`rounded-full px-2 py-0.5 ${r.active ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
            {r.active ? t.active : t.disabled}
          </span>
          {r.pending && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">{t.invitePending}</span>}
        </p>
      </div>
      {!r.isSelf && (
        <div className="flex gap-1.5">
          {r.pending && (
            <button
              className={btn}
              disabled={pending}
              title={t.resendInvite}
              aria-label={t.resendEmail(r.email)}
              onClick={() => {
                if (confirm(t.confirmResend(r.email))) run(() => resendInvite(r.id));
              }}
            >
              <Send className="size-4" />
            </button>
          )}
          <button
            className={btn}
            disabled={pending}
            title={r.role === "admin" ? t.demote : t.promote}
            aria-label={r.role === "admin" ? t.demoteEmail(r.email) : t.promoteEmail(r.email)}
            onClick={() => {
              const to = r.role === "admin" ? "user" : "admin";
              if (confirm(t.confirmRole(r.email, to === "admin"))) run(() => setUserRole(r.id, to));
            }}
          >
            {r.role === "admin" ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
          </button>
          <button
            className={btn}
            disabled={pending}
            title={r.active ? t.disableAccess : t.restoreAccess}
            aria-label={r.active ? t.disableEmail(r.email) : t.restoreEmail(r.email)}
            onClick={() => run(() => setUserActive(r.id, !r.active))}
          >
            {r.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
          </button>
          <button
            className={`${btn} text-red-300`}
            disabled={pending}
            aria-label={t.deleteEmail(r.email)}
            onClick={() => {
              if (confirm(t.confirmDeleteUser(r.email))) run(() => removeUser(r.id));
            }}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </li>
  );
}

type UserManagerProps = {
  rows: Row[];
  q: string;
};

export function UserManager({ rows, q }: UserManagerProps) {
  const [state, action, pending] = useActionState(inviteUser, undefined);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const t = useT().admin;
  return (
    <div className="space-y-6">
      <form action={action} className="rounded-2xl border border-border bg-surface p-4">
        <label htmlFor="invite-email" className="mb-2 block text-sm text-muted">{t.inviteByEmail}</label>
        <div className="flex gap-2">
          <input id="invite-email" name="email" type="email" required placeholder="name@example.com" className={inputCls} />
          <button disabled={pending} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-white disabled:opacity-50">
            <Mail className="size-4" /> {t.inviteButton}
          </button>
        </div>
        {state?.error && <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p>}
        {state?.ok && state.message && <p role="status" className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{state.message}</p>}
      </form>

      <form role="search" className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder={t.searchUsers} aria-label={t.searchUsers} className={`${inputCls} pl-12`} />
      </form>

      {err && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</p>}
      {msg && <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{msg}</p>}
      <ul className="space-y-2">
        {rows.map((r) => <UserRow key={r.id} r={r} onError={setErr} onMessage={setMsg} />)}
        {rows.length === 0 && <li className="text-sm text-muted">{t.noUsers}</li>}
      </ul>
    </div>
  );
}
