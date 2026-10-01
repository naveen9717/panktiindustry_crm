import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminLayout } from "@/components/layout/admin-layout";
import { getTeamMemberById } from "@/lib/services/team-member";
import { getCustomers } from "@/lib/services/customer";
import { TeamMemberCustomersTable } from "@/components/team-members/team-member-customers-table";

export const dynamic = "force-dynamic";

export default async function TeamMemberCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
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
  const sp = await searchParams;
  const page = parseInt(sp.page || "1");
  const search = sp.search || "";

  const [member, customersData] = await Promise.all([
    getTeamMemberById(db, id),
    getCustomers({
      db,
      page,
      pageSize: 10,
      search,
      assignedTeamMemberId: id,
    }),
  ]);

  if (!member) {
    notFound();
  }

  return (
    <AdminLayout user={user}>
      <div className="p-6">
        <TeamMemberCustomersTable
          member={member}
          customers={customersData.customers}
          total={customersData.total}
          page={customersData.page}
          pageSize={customersData.pageSize}
          totalPages={customersData.totalPages}
          currentFilters={{ search }}
        />
      </div>
    </AdminLayout>
  );
}
