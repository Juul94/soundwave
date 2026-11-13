import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./ForgotForm";
import { AuthShell } from "@/components/AuthShell";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).auth.resetPassword };
}

export default async function ForgotPage() {
  const t = await getT();
  return (
    <AuthShell title={t.auth.resetTitle} subtitle={t.auth.resetSub}>
      <ForgotForm />
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-muted hover:text-foreground">{t.auth.backToSignIn}</Link>
      </p>
    </AuthShell>
  );
}
