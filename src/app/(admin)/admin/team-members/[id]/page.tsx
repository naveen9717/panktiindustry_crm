import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminLayout } from "@/components/layout/admin-layout";
import { getTeamMemberById } from "@/lib/services/team-member";
import { TeamMemberDetail } from "@/components/team-members/team-member-detail";

export const dynamic = "force-dynamic";

export default async function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const db = await getDb();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MASTER_ADMIN") {
    redirect("/team/dashboard");
  }

  const { id } = await params;
  const member = await getTeamMemberById(db, id);

  if (!member) {
    notFound();
  }

  return (
    <AdminLayout user={user}>
      <TeamMemberDetail member={member} />
    </AdminLayout>
  );
}
