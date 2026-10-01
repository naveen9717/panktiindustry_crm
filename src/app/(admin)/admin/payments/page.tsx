import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PaymentsTable } from "@/components/payments/payments-table";
import { getPayments, getPaymentStats } from "@/lib/services/payment";
import { getActiveTeamMembers } from "@/lib/services/team-member";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    paymentStatus?: string;
    paymentMode?: string;
    teamMemberId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MASTER_ADMIN") {
    redirect("/team/payments");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const paymentStatus = params.paymentStatus || "";
  const paymentMode = params.paymentMode || "";
  const teamMemberId = params.teamMemberId || "";
  const dateFrom = params.dateFrom || "";
  const dateTo = params.dateTo || "";

  const [paymentsData, stats, teamMembers] = await Promise.all([
    getPayments({
      page,
      pageSize: 10,
      search,
      paymentStatus,
      paymentMode,
      teamMemberId,
      dateFrom,
      dateTo,
    }),
    getPaymentStats(),
    getActiveTeamMembers(),
  ]);

  return (
    <AdminLayout user={user}>
      <div className="p-6">
        <PaymentsTable
          payments={paymentsData.payments}
          total={paymentsData.total}
          page={paymentsData.page}
          pageSize={paymentsData.pageSize}
          totalPages={paymentsData.totalPages}
          stats={stats}
          teamMembers={teamMembers}
          currentFilters={{
            search,
            paymentStatus,
            paymentMode,
            teamMemberId,
            dateFrom,
            dateTo,
          }}
        />
      </div>
    </AdminLayout>
  );
}
