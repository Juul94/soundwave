"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { requestReset } from "@/app/login/actions";
import { btnCls, inputCls } from "@/components/AuthShell";
import { useT } from "@/components/I18n";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestReset, undefined);
  const t = useT();
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-muted">{t.common.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputCls} />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p>}
      {state?.message && <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{state.message}</p>}
      <button type="submit" disabled={pending} className={btnCls}>
        {pending && <Loader2 className="size-4 animate-spin" />} {t.auth.sendReset}
      </button>
    </form>
  );
}
