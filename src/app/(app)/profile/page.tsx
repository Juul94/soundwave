import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { logout } from "@/app/login/actions";
import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLang, getT } from "@/i18n/server";
import { setLang } from "@/i18n/actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).profile.title };
}

const LANG_OPTS = [
  { lang: "da", label: "🇩🇰 Dansk" },
  { lang: "en", label: "🇬🇧 English" },
] as const;

export default async function ProfilePage() {
  const { profile } = await requireUser();
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <>
      <PageTitle title={t.profile.title} />
      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-lg font-medium">{profile.display_name ?? profile.email}</p>
        <p className="text-sm text-muted">{profile.email}</p>
        <span className="mt-3 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">
          {t.roles[profile.role] ?? profile.role}
        </span>
      </div>
      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-muted">{t.profile.language}</p>
        <div className="grid grid-cols-2 gap-2">
          {LANG_OPTS.map((o) => (
            <form key={o.lang} action={setLang.bind(null, o.lang)}>
              <button
                type="submit"
                aria-pressed={lang === o.lang}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm transition ${lang === o.lang ? "border-accent bg-accent/15 text-foreground" : "border-border text-muted hover:text-foreground"}`}
              >
                {o.label}
              </button>
            </form>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {profile.role === "admin" && (
          <Link href="/admin" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-accent">
            <ShieldCheck className="size-5 text-accent" /> {t.profile.adminDashboard}
          </Link>
        )}
        <Link href="/set-password" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-accent">
          {t.auth.changePassword}
        </Link>
        <form action={logout}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left hover:border-red-400">
            <LogOut className="size-5" /> {t.profile.signOut}
          </button>
        </form>
      </div>
    </>
  );
}
