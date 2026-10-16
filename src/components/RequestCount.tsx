"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const EVENT = "sw:requests-changed";
const Ctx = createContext(0);

/** Number of open ("new") song requests, for the admin badge. Refreshes on navigation, app focus and after edits. */
export function RequestCountProvider({ isAdmin, initial, children }: { isAdmin: boolean; initial: number; children: React.ReactNode }) {
  const [count, setCount] = useState(initial);
  const path = usePathname();
  useEffect(() => {
    if (!isAdmin) return;
    const sb = createClient();
    const load = () => {
      if (document.visibilityState !== "visible") return;
      void sb.from("song_requests").select("id", { count: "exact", head: true }).eq("status", "new")
        .then(({ count: c, error }) => { if (!error) setCount(c ?? 0); });
    };
    load();
    document.addEventListener("visibilitychange", load);
    window.addEventListener(EVENT, load);
    return () => {
      document.removeEventListener("visibilitychange", load);
      window.removeEventListener(EVENT, load);
    };
  }, [isAdmin, path]);
  return <Ctx.Provider value={isAdmin ? count : 0}>{children}</Ctx.Provider>;
}

export const useRequestCount = () => useContext(Ctx);
export const requestsChanged = () => window.dispatchEvent(new Event(EVENT));

export function CountBadge({ n, className = "" }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={`min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-4 text-white ${className}`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}
