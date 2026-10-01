import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { TeamLayout } from "@/components/layout/team-layout";
import { TeamMemberDashboard } from "@/components/dashboard/team-member-dashboard";

export const dynamic = "force-dynamic";

export default async function TeamDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "MASTER_ADMIN") {
    redirect("/admin/dashboard");
  }

  return (
    <TeamLayout user={user}>
      <TeamMemberDashboard user={user} />
    </TeamLayout>
  );
}
