import "server-only";
import { cookies, headers } from "next/headers";
import { dict, LANGS, type Lang } from "@/lib/i18n";

export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get("lang")?.value;
  if (LANGS.includes(c as Lang)) return c as Lang;
  return /^da\b/i.test((await headers()).get("accept-language") ?? "") ? "da" : "en";
}

export async function getT() {
  return dict[await getLang()];
}
