"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";

export type FormState = { error?: string; message?: string } | undefined;

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const t = (await getT()).auth;
  if (!email && !password) return { error: t.errEmailPassword };
  if (!email) return { error: t.errEmailAddress };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: t.errInvalidEmail };
  if (!password) return { error: t.errPassword };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: t.errWrong };
  const next = String(formData.get("next") ?? "");
  redirect(/^\/song\/[0-9a-f-]{36}$/i.test(next) ? next : "/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const t = (await getT()).auth;
  if (!email) return { error: t.errEmail };
  const h = await headers();
  const origin = process.env.SITE_URL ?? h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirm` });
  // Same response regardless of whether the account exists.
  return { message: t.resetSent };
}

export async function setPassword(_: FormState, formData: FormData): Promise<FormState> {
  const rawName = formData.get("name");
  const name = rawName === null ? null : String(rawName).trim();
  const password = String(formData.get("password") ?? "");
  const t = (await getT()).auth;
  if (name === "") return { error: t.errName };
  if (password.length < 8) return { error: t.errShort };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser(name ? { password, data: { display_name: name } } : { password });
  if (error) return { error: error.message };
  if (name) await supabase.from("profiles").update({ display_name: name }).eq("id", data.user.id);
  redirect("/");
}
