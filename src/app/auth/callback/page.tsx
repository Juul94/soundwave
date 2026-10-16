"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/I18n";

// Supabase's default invite/reset emails land here with the session in the URL hash.
export default function AuthCallback() {
  const [failed, setFailed] = useState(false);
  const t = useT();

  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const access_token = h.get("access_token");
    const refresh_token = h.get("refresh_token");
    const type = h.get("type");
    if (!access_token || !refresh_token) {
      window.location.replace("/login?error=link");
      return;
    }
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) return setFailed(true);
        window.location.replace(type === "invite" ? "/set-password?new=1" : "/set-password");
      });
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-center text-muted">
      {failed ? <a href="/login?error=link" className="underline">{t.auth.callbackFailed} {t.auth.backToSignIn}</a> : t.auth.signingIn}
    </main>
  );
}
