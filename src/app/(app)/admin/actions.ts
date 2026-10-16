"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n-server";

export type ActionResult = { ok: boolean; error?: string; message?: string };

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "genre";

// ---------- songs ----------
export async function deleteSong(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data: song } = await supabase
    .from("songs")
    .select("audio_storage_path, cover_storage_path")
    .eq("id", id)
    .single();
  if (!song) return { ok: false, error: (await getT()).admin.songNotFound };

  // Row first (so users never see a song with a missing file), then files.
  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  const failures: string[] = [];
  const a = await supabase.storage.from("audio").remove([song.audio_storage_path]);
  if (a.error) failures.push(song.audio_storage_path);
  if (song.cover_storage_path) {
    const c = await supabase.storage.from("covers").remove([song.cover_storage_path, `thumbs/${song.cover_storage_path}`]);
    if (c.error) failures.push(song.cover_storage_path);
  }
  revalidatePath("/admin/songs");
  revalidatePath("/");
  return failures.length
    ? { ok: true, message: (await getT()).admin.deletedButFiles(failures.join(", ")) }
    : { ok: true };
}

// ---------- genres ----------
export async function createGenre(_: ActionResult | undefined, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { ok: false, error: (await getT()).admin.enterGenre };
  const { error } = await supabase.from("genres").insert({ name, slug: slugify(name) });
  if (error) return { ok: false, error: error.code === "23505" ? (await getT()).admin.genreExists : error.message };
  revalidatePath("/admin/genres");
  return { ok: true, message: (await getT()).admin.genreAdded(name) };
}

export async function renameGenre(id: string, name: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const n = name.trim();
  if (!n) return { ok: false, error: (await getT()).admin.nameEmpty };
  const { error } = await supabase.from("genres").update({ name: n, slug: slugify(n) }).eq("id", id);
  if (error) return { ok: false, error: error.code === "23505" ? (await getT()).admin.genreExists : error.message };
  revalidatePath("/admin/genres");
  return { ok: true };
}

export async function deleteGenre(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { count } = await supabase.from("songs").select("id", { count: "exact", head: true }).eq("genre_id", id);
  if (count) {
    return { ok: false, error: (await getT()).admin.genreInUse(count ?? 0) };
  }
  const { error } = await supabase.from("genres").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/genres");
  return { ok: true };
}

// ---------- users ----------
export async function inviteUser(_: ActionResult | undefined, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: (await getT()).admin.invalidEmail };
  const h = await headers();
  const origin = process.env.SITE_URL ?? h.get("origin") ?? `https://${h.get("host")}`;
  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true, message: (await getT()).admin.inviteSent(email) };
}

export async function resendInvite(userId: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error: e } = await admin.auth.admin.getUserById(userId);
  const email = data.user?.email;
  if (e || !email) return { ok: false, error: e?.message ?? (await getT()).admin.actionFailed };
  const h = await headers();
  const origin = process.env.SITE_URL ?? h.get("origin") ?? `https://${h.get("host")}`;
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/auth/callback` });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: (await getT()).admin.inviteSent(email) };
}

export async function setUserRole(userId: string, role: "admin" | "user"): Promise<ActionResult> {
  const { user } = await requireAdmin();
  if (userId === user.id && role !== "admin") {
    return { ok: false, error: (await getT()).admin.noSelfDemote };
  }
  // Uses service role; the DB trigger still blocks removing the last admin.
  const { error } = await createAdminClient().from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const { user } = await requireAdmin();
  if (userId === user.id && !active) return { ok: false, error: (await getT()).admin.noSelfDisable };
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_active: active }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function removeUser(userId: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  if (userId === user.id) return { ok: false, error: (await getT()).admin.noSelfDelete };
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", userId).single();
  if (target?.role === "admin") {
    return { ok: false, error: (await getT()).admin.demoteFirst };
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}
