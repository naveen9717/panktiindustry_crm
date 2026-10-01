import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminLayout } from "@/components/layout/admin-layout";
import { SettingsPage } from "@/components/settings/settings-page";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MASTER_ADMIN") {
    redirect("/team/settings");
  }

  return (
    <AdminLayout user={user}>
      <div className="p-6">
        <SettingsPage user={user} isAdmin={true} />
      </div>
    </AdminLayout>
  );
}
