"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isStandalone } from "@/components/InstallGate";

/** Records "last online" whenever the installed app (PWA) is opened or brought to the foreground. */
export function AppSeen() {
  useEffect(() => {
    if (!isStandalone()) return;
    const supabase = createClient();
    let last = 0;
    const touch = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 5 * 60_000) return;
      last = Date.now();
      void supabase.rpc("touch_app_seen").then(() => {});
    };
    touch();
    document.addEventListener("visibilitychange", touch);
    return () => document.removeEventListener("visibilitychange", touch);
  }, []);
  return null;
}
