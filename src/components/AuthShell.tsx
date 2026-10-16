import { LogoMark } from "@/components/Logo";
import { AuthFooter } from "@/components/I18n";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 safe-t safe-b">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />
      <div className="sw-fade relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={56} animate />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xl">{children}</div>
        <AuthFooter />
      </div>
    </main>
  );
}

export const inputCls =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";
export const btnCls =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50";
