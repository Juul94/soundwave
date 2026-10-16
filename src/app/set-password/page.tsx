import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SetPasswordForm } from "./SetPasswordForm";
import { AuthShell } from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).auth.setPassword };
}

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const isNew = (await searchParams).new === "1";
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?error=link");
  const t = await getT();
  return (
    <AuthShell title={isNew ? t.auth.welcome : t.auth.changePassword} subtitle={isNew ? t.auth.setSubNew : t.auth.setSubChange}>
      <SetPasswordForm isNew={isNew} defaultName={String(data.user.user_metadata?.display_name ?? "")} />
      {!isNew && (
        <p className="mt-4 text-center text-sm">
          <Link href="/profile" className="text-muted hover:text-foreground">{t.auth.backToProfile}</Link>
        </p>
      )}
    </AuthShell>
  );
}
