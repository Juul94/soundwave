import type { Metadata } from "next";
import { UserManager } from "./UserManager";
import { PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types";
import { getT } from "@/i18n/server";
import { firstParam } from "@/utils/searchParams";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.usersTitle };
}

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const q = firstParam((await searchParams).q);
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: authList }, { data: recent }, T] = await Promise.all([
    admin.from("profiles").select("*").order("created_at"),
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("recently_played").select("user_id, songs(title)").order("played_at", { ascending: false }),
    getT(),
  ]);
  const confirmed = new Map((authList?.users ?? []).map((u) => [u.id, !!u.email_confirmed_at || !!u.last_sign_in_at]));
  const lastHeard = new Map<string, string>();
  for (const r of (recent ?? []) as unknown as { user_id: string; songs: { title: string } | null }[]) {
    if (r.songs && !lastHeard.has(r.user_id)) lastHeard.set(r.user_id, r.songs.title);
  }

  const needle = (q ?? "").toLowerCase();
  const rows = ((profiles ?? []) as Profile[])
    .filter((p) => !needle || `${p.email} ${p.display_name}`.toLowerCase().includes(needle))
    .map((p) => ({
      id: p.id,
      email: p.email ?? "",
      name: p.display_name ?? "",
      role: p.role,
      active: p.is_active,
      pending: !confirmed.get(p.id),
      isSelf: p.id === user.id,
      lastSeen: p.last_seen_app,
      lastHeard: lastHeard.get(p.id) ?? null,
    }));

  return (
    <>
      <PageTitle title={T.admin.usersTitle} sub={T.admin.usersSub} />
      <UserManager rows={rows} q={q ?? ""} />
    </>
  );
}
