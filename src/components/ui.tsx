import Link from "next/link";
import { Music2 } from "lucide-react";

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-6 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="sw-fade flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Music2 className="size-7" />
      </div>
      <h2 className="mt-4 text-lg font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && (
        <Link href={action.href} className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white">
          {action.label}
        </Link>
      )}
    </div>
  );
}
