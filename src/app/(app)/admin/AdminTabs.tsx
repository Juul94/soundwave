"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/I18n";
import { CountBadge, useRequestCount } from "@/components/RequestCount";

const TABS = [
  { href: "/admin", key: "dashboard" },
  { href: "/admin/upload", key: "upload" },
  { href: "/admin/songs", key: "songs" },
  { href: "/admin/genres", key: "genres" },
  { href: "/admin/users", key: "users" },
  { href: "/admin/requests", key: "requests" },
] as const;

export function AdminTabs() {
  const path = usePathname();
  const tr = useT().admin;
  const requests = useRequestCount();
  // Highlight the tapped tab immediately, before the server finishes rendering the page.
  const [nav, setNav] = useState<{ from: string; href: string } | null>(null);
  const current = nav && nav.from === path ? nav.href : path;
  const active = (href: string) => (href === "/admin" ? current === "/admin" : current.startsWith(href));
  return (
    <nav aria-label={tr.nav} className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          onClick={() => setNav({ from: path, href: t.href })}
          aria-current={active(t.href) ? "page" : undefined}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition ${
            active(t.href)
              ? "border-accent bg-accent/15 text-foreground"
              : "border-border bg-surface text-muted hover:border-accent hover:text-foreground"
          }`}
        >
          {tr.tabs[t.key]}
          {t.key === "requests" && <CountBadge n={requests} />}
        </Link>
      ))}
    </nav>
  );
}
