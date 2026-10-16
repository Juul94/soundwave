"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { login } from "./actions";
import { btnCls, inputCls } from "@/components/AuthShell";
import { useT } from "@/components/I18n";

export function LoginForm({ initialError, next }: { initialError?: string; next?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  const error = state?.error ?? initialError;
  const [email, setEmail] = useState("");
  const [show, setShow] = useState(false);
  const t = useT();
  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-muted">{t.common.email}</label>
        <input
          id="email" name="email" type="email" autoComplete="email" required className={inputCls}
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm text-muted">{t.common.password}</label>
        <div className="relative">
          <input
            id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required
            className={`${inputCls} pr-12`}
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
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={pending} className={btnCls}>
        {pending && <Loader2 className="size-4 animate-spin" />} {t.auth.signIn}
      </button>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-foreground">{t.auth.forgot}</Link>
      </p>
    </form>
  );
}
