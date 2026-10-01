import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { TeamLayout } from "@/components/layout/team-layout";
import { TeamPaymentsTable } from "@/components/payments/team-payments-table";
import { getPayments, getPaymentStats } from "@/lib/services/payment";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    paymentStatus?: string;
  }>;
}

export default async function TeamPaymentsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "MASTER_ADMIN") {
    redirect("/admin/payments");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const paymentStatus = params.paymentStatus || "";

  const [paymentsData, stats] = await Promise.all([
    getPayments({
      page,
      pageSize: 10,
      search,
      paymentStatus,
      userId: user.id,
      userRole: user.role,
    }),
    getPaymentStats(user.id, user.role),
  ]);

  return (
    <TeamLayout user={user}>
      <div className="p-6">
        <TeamPaymentsTable
          payments={paymentsData.payments}
          total={paymentsData.total}
          page={paymentsData.page}
          pageSize={paymentsData.pageSize}
          totalPages={paymentsData.totalPages}
          stats={stats}
          currentFilters={{ search, paymentStatus }}
        />
      </div>
    </TeamLayout>
  );
}
