import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

/**
 * Returns the signed-in, active user's profile or redirects to /login.
 * Cached per request so layouts and pages share one lookup; the JWT is verified
 * locally (getClaims) instead of a network round trip to Supabase Auth.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const user = { id: claims.sub, email: claims.email as string | undefined };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=disabled");
  }
  return { supabase, user, profile };
});

/** Same as requireUser but additionally enforces role = admin. */
export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile.role !== "admin") redirect("/");
  return ctx;
}

/** Attach stable, cacheable cover URLs (served privately by /api/cover): full size and a small list thumbnail. */
export async function withCovers<T extends { cover_storage_path: string | null }>(
  _supabase: Awaited<ReturnType<typeof createClient>>,
  songs: T[],
): Promise<(T & { cover_url: string | null; cover_thumb: string | null })[]> {
  return songs.map((s) => {
    const p = s.cover_storage_path && encodeURIComponent(s.cover_storage_path);
    return { ...s, cover_url: p ? `/api/cover?p=${p}` : null, cover_thumb: p ? `/api/cover?p=${p}&t=1` : null };
  });
}
