import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { AuthShell } from "@/components/AuthShell";
import { getT } from "@/i18n/server";
import { firstParam } from "@/utils/searchParams";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).auth.signIn };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const error = firstParam(sp.error);
  const next = firstParam(sp.next);
  const t = await getT();
  const ERRORS: Record<string, string> = { link: t.auth.linkInvalid, disabled: t.auth.disabled };
  return (
    <AuthShell title={t.auth.welcome} subtitle={t.auth.loginSub}>
      <LoginForm initialError={error ? ERRORS[error] : undefined} next={next} />
    </AuthShell>
  );
}
