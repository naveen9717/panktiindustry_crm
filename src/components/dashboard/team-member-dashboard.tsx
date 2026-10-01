import { getTeamMemberDashboardStats, getRecentLeads, getRecentPayments } from "@/lib/services/dashboard";
import { getLeadsOverTime, getCustomerStats } from "@/lib/services/customer";
import { getPaymentsOverTime } from "@/lib/services/payment";
import { KpiCard } from "./kpi-card";
import { LeadsOverTimeChart, LeadStatusChart, PaymentsOverTimeChart } from "./charts";
import { Users, Target, TrendingUp, Clock, IndianRupee } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge, getLeadStatusBadgeVariant, getPaymentStatusBadgeVariant } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getDb } from "@/lib/db/local";

export async function TeamMemberDashboard({ user }: { user: { id: string; firstName: string; lastName: string; email: string; role: string } }) {
  const db = await getDb();
  const [stats, recentLeads, recentPayments, leadsOverTime, customerStats, paymentsOverTime] =
    await Promise.all([
      getTeamMemberDashboardStats({ db, userId: user.id, userRole: user.role }),
      getRecentLeads(db, 5, user.id, user.role),
      getRecentPayments(db, 5, user.id, user.role),
      getLeadsOverTime(db, user.id, user.role),
      getCustomerStats(db, user.id, user.role),
      getPaymentsOverTime(db, user.id, user.role),
    ]);

  const statusChartData = Object.entries(customerStats.byStatus)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value,
    }));

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-sm text-slate-500">Here&apos;s what&apos;s happening with your customers today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="My Customers"
          value={stats.myCustomers}
          icon={<Users className="h-6 w-6 text-blue-600" />}
          iconClassName="kpi-tile-blue"
        />
        <KpiCard
          title="Active Leads"
          value={stats.activeLeads}
          icon={<Target className="h-6 w-6 text-amber-600" />}
          iconClassName="kpi-tile-amber"
        />
        <KpiCard
          title="Converted"
          value={stats.convertedLeads}
          icon={<TrendingUp className="h-6 w-6 text-emerald-600" />}
          iconClassName="kpi-tile-emerald"
        />
        <KpiCard
          title="Pending Payments"
          value={formatCurrency(stats.pendingPayments)}
          icon={<Clock className="h-6 w-6 text-orange-600" />}
          iconClassName="kpi-tile-orange"
        />
        <KpiCard
          title="Received"
          value={formatCurrency(stats.paymentsReceived)}
          icon={<IndianRupee className="h-6 w-6 text-emerald-600" />}
          iconClassName="kpi-tile-emerald"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LeadsOverTimeChart data={leadsOverTime} />
        <LeadStatusChart data={statusChartData} />
      </div>

      <PaymentsOverTimeChart data={paymentsOverTime} />

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Customers</CardTitle>
            <Link href="/team/customers" className="text-sm font-medium text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLeads.length === 0 ? (
                <p className="text-sm text-slate-500">No customers assigned yet</p>
              ) : (
                recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.email || lead.phone}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={getLeadStatusBadgeVariant(lead.leadStatus)}>
                        {lead.leadStatus.replace(/_/g, " ")}
                      </Badge>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(lead.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Payments</CardTitle>
            <Link href="/team/payments" className="text-sm font-medium text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.length === 0 ? (
                <p className="text-sm text-slate-500">No payments yet</p>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{payment.customer.name}</p>
                      <p className="text-xs text-slate-500">{formatDate(payment.paymentDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
                      <Badge variant={getPaymentStatusBadgeVariant(payment.paymentStatus)}>
                        {payment.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
