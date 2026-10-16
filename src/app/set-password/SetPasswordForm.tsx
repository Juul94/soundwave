"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { setPassword } from "@/app/login/actions";
import { btnCls, inputCls } from "@/components/AuthShell";
import { useT } from "@/components/I18n";

export function SetPasswordForm({ isNew, defaultName }: { isNew: boolean; defaultName: string }) {
  const [state, action, pending] = useActionState(setPassword, undefined);
  const [name, setName] = useState(defaultName);
  const [show, setShow] = useState(false);
  const t = useT();
  return (
    <form action={action} className="space-y-4">
      {isNew && (
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm text-muted">{t.auth.name}</label>
        <input
          id="name" name="name" autoComplete="name" required maxLength={60} className={inputCls}
          value={name} onChange={(e) => setName(e.target.value)}
        />
      </div>
      )}
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm text-muted">{isNew ? t.common.password : t.auth.newPassword}</label>
        <div className="relative">
          <input
            id="password" name="password" type={show ? "text" : "password"} autoComplete="new-password"
            minLength={8} required className={`${inputCls} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? t.common.hidePassword : t.common.showPassword}
            aria-pressed={show}
            className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-foreground"
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">{t.auth.minChars}</p>
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p>}
      <button type="submit" disabled={pending} className={btnCls}>
        {pending && <Loader2 className="size-4 animate-spin" />} {isNew ? t.auth.createAccount : t.auth.savePassword}
      </button>
    </form>
  );
}
