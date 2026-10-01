import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminLayout } from "@/components/layout/admin-layout";
import { CustomersTable } from "@/components/customers/customers-table";
import { getCustomers } from "@/lib/services/customer";
import { getActiveTeamMembers } from "@/lib/services/team-member";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    leadStatus?: string;
    assignedTeamMemberId?: string;
    state?: string;
    city?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const db = await getDb();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MASTER_ADMIN") {
    redirect("/team/customers");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const leadStatus = params.leadStatus || "";
  const assignedTeamMemberId = params.assignedTeamMemberId || "";
  const state = params.state || "";
  const city = params.city || "";
  const dateFrom = params.dateFrom || "";
  const dateTo = params.dateTo || "";
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = (params.sortOrder as "asc" | "desc") || "desc";

  const [customersData, teamMembers] = await Promise.all([
    getCustomers({
      db,
      page,
      pageSize: 10,
      search,
      leadStatus,
      assignedTeamMemberId,
      state,
      city,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    }),
    getActiveTeamMembers(db),
  ]);

  return (
    <AdminLayout user={user}>
      <div className="p-6">
        <CustomersTable
          customers={customersData.customers}
          total={customersData.total}
          page={customersData.page}
          pageSize={customersData.pageSize}
          totalPages={customersData.totalPages}
          teamMembers={teamMembers}
          currentFilters={{
            search,
            leadStatus,
            assignedTeamMemberId,
            state,
            city,
            dateFrom,
            dateTo,
            sortBy,
            sortOrder,
          }}
        />
      </div>
    </AdminLayout>
  );
}
