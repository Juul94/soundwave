"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Library, ListMusic, Music, ShieldCheck, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useT } from "@/components/I18n";
import { CountBadge, useRequestCount } from "@/components/RequestCount";

const ITEMS = [
  { href: "/", key: "browse", icon: Library },
  { href: "/favorites", key: "favorites", icon: Heart },
  { href: "/playlists", key: "playlists", icon: ListMusic },
  { href: "/request", key: "request", icon: Music },
  { href: "/profile", key: "profile", icon: User },
] as const;

// On the phone bar the admin gets Admin in place of Request, to keep it at five items.
const navItems = (isAdmin: boolean, compact = false) =>
  isAdmin
    ? [...ITEMS.filter((i) => !(compact && i.href === "/request")), { href: "/admin", key: "admin", icon: ShieldCheck } as const]
    : ITEMS;

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const active = useActive();
  const items = navItems(isAdmin);
  const t = useT();
  const requests = useRequestCount();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-border bg-surface/60 p-4 md:flex">
      <Link href="/" className="mb-8 px-2 pt-2"><Logo /></Link>
      <nav aria-label={t.nav.main} className="space-y-1">
        {items.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-white/5 ${
              active(href) ? "bg-white/5 text-foreground" : "text-muted"
            }`}
          >
            <Icon className={`size-5 ${active(href) ? "text-accent" : ""}`} />
            {t.nav[key]}
            {href === "/admin" && <CountBadge n={requests} className="ml-auto" />}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const active = useActive();
  const t = useT();
  const requests = useRequestCount();
  return (
    <nav
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur safe-b md:hidden"
    >
      {navItems(isAdmin, true).map(({ href, key, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
            active(href) ? "text-accent" : "text-muted"
          }`}
        >
          <span className="relative">
            <Icon className="size-5" />
            {href === "/admin" && <CountBadge n={requests} className="absolute -right-2.5 -top-1.5" />}
          </span>
          {t.nav[key]}
        </Link>
      ))}
    </nav>
  );
}
