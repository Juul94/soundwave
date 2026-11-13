import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { RequestForm } from "./RequestForm";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).request.title };
}

export default async function RequestPage() {
  await requireUser();
  const t = await getT();
  return (
    <>
      <PageTitle title={t.request.title} sub={t.request.sub} />
      <RequestForm />
    </>
  );
}
