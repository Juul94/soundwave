"use client";

import { createContext, useContext } from "react";
import { dict, type Lang } from "@/lib/i18n";

const Ctx = createContext<Lang>("en");

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx value={lang}>{children}</Ctx>;
}

export const useLang = () => useContext(Ctx);
export const useT = () => dict[useContext(Ctx)];

export function AuthFooter() {
  return <p className="mt-6 text-center text-xs text-muted">{useT().auth.footer}</p>;
}
