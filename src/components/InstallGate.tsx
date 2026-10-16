"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Download, MoreVertical, PlusSquare, Share } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { useT } from "@/components/I18n";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  window.matchMedia("(display-mode: minimal-ui)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  document.referrer.startsWith("android-app://");

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS reports as Mac

const isMobile = () => isIOS() || /android|mobile/i.test(navigator.userAgent);

type Env = "ssr" | "skip" | "ios" | "other";
const getEnv = (): Env =>
  process.env.NODE_ENV !== "production" || isStandalone() || !isMobile() ? "skip" : isIOS() ? "ios" : "other";
const subscribeNone = () => () => {};

/** Full-screen "install the app" screen shown whenever the site is opened in a normal browser tab on a phone or tablet. */
export function InstallGate() {
  const env = useSyncExternalStore(subscribeNone, getEnv, () => "ssr" as Env);
  const pathname = usePathname();
  const t = useT().install;
  // Registration (/set-password) and auth links come first; the install screen follows once that is done.
  const registering = ["/set-password", "/auth", "/login", "/forgot-password"].some((p) => pathname.startsWith(p));
  const show = (env === "ios" || env === "other") && !registering;
  const ios = env === "ios";
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (!show) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [show]);

  if (!show) return null;

  const install = async () => {
    if (!evt) return setManual(true);
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    setEvt(null);
    if (outcome === "dismissed") setManual(true);
  };

  const step = "flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left text-sm";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background px-4 safe-t safe-b">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />
      <div className="relative w-full max-w-sm py-8 text-center">
        <div className="flex justify-center">
          <LogoMark size={64} animate />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          {installed ? t.installed : t.get}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {installed ? t.installedBody : t.body}
        </p>

        {!installed && !ios && (
          <button
            type="button"
            onClick={install}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-3 font-medium text-white transition hover:opacity-90"
          >
            <Download className="size-5" /> {t.button}
          </button>
        )}

        {!installed && ios && (
          <ol className="mt-6 space-y-2">
            <li className={step}>
              <Share className="mt-0.5 size-5 shrink-0 text-accent" />
              <span>{t.iosShare}</span>
            </li>
            <li className={step}>
              <PlusSquare className="mt-0.5 size-5 shrink-0 text-accent" />
              <span>{t.iosAdd}</span>
            </li>
            <li className="text-xs text-muted">{t.iosHint}</li>
          </ol>
        )}

        {!installed && !ios && manual && (
          <ul className="mt-4 space-y-2">
            <li className={step}>
              <MoreVertical className="mt-0.5 size-5 shrink-0 text-accent" />
              <span>{t.android}</span>
            </li>
          </ul>
        )}

      </div>
    </div>
  );
}
