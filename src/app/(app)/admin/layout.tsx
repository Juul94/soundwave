import { AdminTabs } from "./AdminTabs";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin(); // real server-side authorization, not just hidden links
  return (
    <>
      <AdminTabs />
      {children}
    </>
  );
}
