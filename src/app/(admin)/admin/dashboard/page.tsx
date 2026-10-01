import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MASTER_ADMIN") {
    redirect("/team/dashboard");
  }

  return (
    <AdminLayout user={user}>
      <AdminDashboard user={user} />
    </AdminLayout>
  );
}
