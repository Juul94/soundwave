"use server";

import { cookies } from "next/headers";
import { LANGS, type Lang } from "@/i18n/dictionary";

export async function setLang(lang: Lang) {
  if (!LANGS.includes(lang)) return;
  (await cookies()).set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
