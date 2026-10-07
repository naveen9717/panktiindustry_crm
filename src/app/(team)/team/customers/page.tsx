import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { TeamLayout } from "@/components/layout/team-layout";
import { TeamCustomersTable } from "@/components/customers/team-customers-table";
import { getCustomers } from "@/lib/services/customer";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    leadStatus?: string;
    state?: string;
    city?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function TeamCustomersPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const db = await getDb();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "MASTER_ADMIN") {
    redirect("/admin/customers");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const leadStatus = params.leadStatus || "";
  const state = params.state || "";
  const city = params.city || "";
  const dateFrom = params.dateFrom || "";
  const dateTo = params.dateTo || "";

  const data = await getCustomers({ db, 
    page,
    pageSize: 10,
    search,
    leadStatus,
    state,
    city,
    dateFrom,
    dateTo,
    userId: user.id,
    userRole: user.role,
  });

  return (
    <TeamLayout user={user}>
      <div className="p-6">
        <TeamCustomersTable
          customers={data.customers}
          total={data.total}
          page={data.page}
          pageSize={data.pageSize}
          totalPages={data.totalPages}
          currentFilters={{ search, leadStatus, state, city, dateFrom, dateTo }}
        />
      </div>
    </TeamLayout>
  );
}
