"use client";

import { Loader2 } from "lucide-react";
import { useT } from "@/components/I18n";

export default function AdminLoading() {
  const t = useT();
  return (
    <div role="status" aria-label={t.common.loading} className="flex justify-center py-16">
      <Loader2 className="size-8 animate-spin text-accent" />
    </div>
  );
}
