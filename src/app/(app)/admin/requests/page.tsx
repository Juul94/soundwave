import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import type { SongRequest } from "@/lib/requests";
import { RequestList } from "./RequestList";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).admin.requestsTitle };
}

export default async function RequestsPage() {
  const { supabase } = await requireAdmin();
  const t = (await getT()).admin;
  const { data } = await supabase
    .from("song_requests")
    .select("id, title, moods, voice, style_notes, lyrics, description, status, created_at, profiles(display_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);
  const requests = (data ?? []) as unknown as SongRequest[];
  const open = requests.filter((r) => r.status === "new").length;
  return (
    <>
      <PageTitle title={t.requestsTitle} sub={open ? t.newCount(open) : t.caughtUp} />
      <RequestList initial={requests} />
    </>
  );
}
