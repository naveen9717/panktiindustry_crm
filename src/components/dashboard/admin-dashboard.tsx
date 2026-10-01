import { getAdminDashboardStats, getRecentLeads, getRecentPayments, getTeamMemberPerformance } from "@/lib/services/dashboard";
import { getLeadsOverTime, getCustomerStats } from "@/lib/services/customer";
import { getPaymentsOverTime } from "@/lib/services/payment";
import { KpiCard } from "./kpi-card";
import { LeadsOverTimeChart, LeadStatusChart, PaymentsOverTimeChart, TeamPerformanceChart } from "./charts";
import { Users, UserCheck, Target, TrendingUp, Clock, IndianRupee, CreditCard } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { Badge, getLeadStatusBadgeVariant, getPaymentStatusBadgeVariant } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getDb } from "@/lib/db/local";

export async function AdminDashboard({ user }: { user: { id: string; firstName: string; lastName: string; email: string; role: string } }) {
  const db = await getDb();
  const [stats, recentLeads, recentPayments, teamPerformance, leadsOverTime, customerStats, paymentsOverTime] =
    await Promise.all([
      getAdminDashboardStats({ db }),
      getRecentLeads(db, 5),
      getRecentPayments(db, 5),
      getTeamMemberPerformance(db),
      getLeadsOverTime(db),
      getCustomerStats(db),
      getPaymentsOverTime(db),
    ]);

  const statusChartData = Object.entries(customerStats.byStatus).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Leads"
          value={stats.totalLeads}
          icon={<Users className="h-6 w-6 text-blue-600" />}
          iconClassName="bg-blue-50"
        />
        <KpiCard
          title="Team Members"
          value={stats.totalTeamMembers}
          icon={<UserCheck className="h-6 w-6 text-emerald-600" />}
          iconClassName="bg-emerald-50"
        />
        <KpiCard
          title="Active Leads"
          value={stats.activeLeads}
          icon={<Target className="h-6 w-6 text-amber-600" />}
          iconClassName="bg-amber-50"
        />
        <KpiCard
          title="Converted"
          value={stats.convertedLeads}
          icon={<TrendingUp className="h-6 w-6 text-violet-600" />}
          iconClassName="bg-violet-50"
        />
        <KpiCard
          title="Pending Payments"
          value={formatCurrency(stats.pendingPayments)}
          icon={<Clock className="h-6 w-6 text-orange-600" />}
          iconClassName="bg-orange-50"
        />
        <KpiCard
          title="Payments Received"
          value={formatCurrency(stats.paymentsReceived)}
          icon={<IndianRupee className="h-6 w-6 text-emerald-600" />}
          iconClassName="bg-emerald-50"
        />
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<CreditCard className="h-6 w-6 text-blue-600" />}
          iconClassName="bg-blue-50"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LeadsOverTimeChart data={leadsOverTime} />
        <LeadStatusChart data={statusChartData} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PaymentsOverTimeChart data={paymentsOverTime} />
        <TeamPerformanceChart data={teamPerformance} />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Leads</CardTitle>
            <Link href="/admin/customers" className="text-sm font-medium text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLeads.length === 0 ? (
                <p className="text-sm text-slate-500">No leads yet</p>
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
            <Link href="/admin/payments" className="text-sm font-medium text-blue-600 hover:underline">
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
                      <p className="text-xs text-slate-500">
                        {payment.teamMember.firstName} {payment.teamMember.lastName}
                      </p>
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
