"use client";

import { createContext, useContext } from "react";
import { dict, type Lang } from "@/i18n/dictionary";

const Ctx = createContext<Lang>("en");

type I18nProviderProps = {
  lang: Lang;
  children: React.ReactNode;
};

export function I18nProvider({ lang, children }: I18nProviderProps) {
  return <Ctx value={lang}>{children}</Ctx>;
}

export const useLang = () => useContext(Ctx);
export const useT = () => dict[useContext(Ctx)];

export function AuthFooter() {
  return <p className="mt-6 text-center text-xs text-muted">{useT().auth.footer}</p>;
}
