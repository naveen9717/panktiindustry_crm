import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminLayout } from "@/components/layout/admin-layout";
import { getTeamMemberById } from "@/lib/services/team-member";
import { getPayments } from "@/lib/services/payment";
import { TeamMemberPaymentsTable } from "@/components/team-members/team-member-payments-table";

export const dynamic = "force-dynamic";

export default async function TeamMemberPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MASTER_ADMIN") {
    redirect("/team/dashboard");
  }

  const { id } = await params;
  const sp = await searchParams;
  const page = parseInt(sp.page || "1");
  const search = sp.search || "";

  const [member, paymentsData] = await Promise.all([
    getTeamMemberById(id),
    getPayments({
      page,
      pageSize: 10,
      search,
      teamMemberId: id,
    }),
  ]);

  if (!member) {
    notFound();
  }

  return (
    <AdminLayout user={user}>
      <div className="p-6">
        <TeamMemberPaymentsTable
          member={member}
          payments={paymentsData.payments}
          total={paymentsData.total}
          page={paymentsData.page}
          pageSize={paymentsData.pageSize}
          totalPages={paymentsData.totalPages}
          currentFilters={{ search }}
        />
      </div>
    </AdminLayout>
  );
}
