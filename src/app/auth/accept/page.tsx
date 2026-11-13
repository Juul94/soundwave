import type { Metadata } from "next";
import { AuthShell, btnCls } from "@/components/AuthShell";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).auth.acceptInvitation };
}

export default async function AcceptPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { token_hash, type } = await searchParams;
  const href = `/auth/confirm?${new URLSearchParams({ token_hash: token_hash ?? "", type: type ?? "", go: "1" })}`;
  const invite = type === "invite";
  const t = await getT();
  return (
    <AuthShell
      title={invite ? t.auth.invited : t.auth.resetTitle}
      subtitle={invite ? t.auth.invitedSub : t.auth.resetTapSub}
    >
      <a href={href} className={btnCls}>{invite ? t.auth.acceptInvitation : t.auth.continue}</a>
    </AuthShell>
  );
}
