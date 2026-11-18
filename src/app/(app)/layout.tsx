import { BottomNav, Sidebar } from "@/components/AppNav";
import { AppSeen } from "@/components/AppSeen";
import { RequestCountProvider } from "@/components/RequestCount";
import { FavoritesProvider } from "@/components/FavoritesProvider";
import { FullPlayer } from "@/components/player/FullPlayer";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, user, profile } = await requireUser();
  const isAdmin = profile.role === "admin";
  const [{ data: favs }, { count: openRequests }] = await Promise.all([
    supabase.from("favorites").select("song_id").eq("user_id", user.id),
    isAdmin
      ? supabase.from("song_requests").select("id", { count: "exact", head: true }).eq("status", "new")
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <PlayerProvider userId={user.id}>
      <FavoritesProvider userId={user.id} initial={(favs ?? []).map((f) => f.song_id)}>
      <RequestCountProvider isAdmin={isAdmin} initial={openRequests ?? 0}>
        <Sidebar isAdmin={isAdmin} />
        <div className="md:pl-60">
          <main className="mx-auto max-w-5xl px-4 pb-48 safe-t md:px-8 md:pb-32"><div className="mt-[50px]">{children}</div></main>
        </div>
        <MiniPlayer />
        <BottomNav isAdmin={isAdmin} />
        <FullPlayer />
        <AppSeen />
      </RequestCountProvider>
      </FavoritesProvider>
    </PlayerProvider>
  );
}
