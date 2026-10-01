"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { formatDate, formatCurrency, truncate } from "@/lib/utils";
import { Badge, getPaymentStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Plus, Filter, Download, IndianRupee, Clock, CreditCard, CheckCircle } from "lucide-react";
import type { Payment, User, Customer } from "@/db/schema";

type PaymentWithRelations = Payment & {
  customer: Pick<Customer, "id" | "name" | "email" | "phone">;
  teamMember: Pick<User, "id" | "firstName" | "lastName">;
};

interface PaymentStats {
  totalAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  partialAmount: number;
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  partialCount: number;
}

interface PaymentsTableProps {
  payments: PaymentWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: PaymentStats;
  teamMembers: Pick<User, "id" | "firstName" | "lastName" | "email">[];
  currentFilters: {
    search: string;
    paymentStatus: string;
    paymentMode: string;
    teamMemberId: string;
    dateFrom: string;
    dateTo: string;
  };
}

const PAYMENT_STATUSES = ["PENDING", "PARTIAL", "PAID", "FAILED", "REFUNDED"];
const PAYMENT_MODES = ["CASH", "BANK_TRANSFER", "UPI", "CREDIT_CARD", "DEBIT_CARD", "CHEQUE", "OTHER"];

export function PaymentsTable({
  payments,
  total,
  page,
  pageSize,
  totalPages,
  stats,
  teamMembers,
  currentFilters,
}: PaymentsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = React.useState(false);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    if (!("page" in updates)) {
      params.delete("page");
    }
    router.push(`/admin/payments?${params.toString()}`);
  };

  const columns: ColumnDef<PaymentWithRelations, any>[] = [
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-900">{row.original.customer.name}</p>
          <p className="text-xs text-slate-500">{row.original.customer.email || row.original.customer.phone}</p>
        </div>
      ),
    },
    {
      accessorKey: "teamMember",
      header: "Team Member",
      cell: ({ row }) => `${row.original.teamMember.firstName} ${row.original.teamMember.lastName}`,
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-medium text-slate-900">{formatCurrency(row.original.amount)}</span>
      ),
    },
    {
      accessorKey: "paymentDate",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.paymentDate),
    },
    {
      accessorKey: "paymentMode",
      header: "Mode",
      cell: ({ row }) => row.original.paymentMode.replace(/_/g, " "),
    },
    {
      accessorKey: "paymentStatus",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getPaymentStatusBadgeVariant(row.original.paymentStatus)}>
          {row.original.paymentStatus}
        </Badge>
      ),
    },
    {
      accessorKey: "transactionId",
      header: "Transaction ID",
      cell: ({ row }) => row.original.transactionId || "-",
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ row }) => truncate(row.original.remarks, 30) || "-",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500">Track and manage all payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Amount"
          value={formatCurrency(stats.totalAmount)}
          icon={<IndianRupee className="h-6 w-6 text-blue-600" />}
          iconClassName="kpi-tile-blue"
        />
        <KpiCard
          title="Received"
          value={formatCurrency(stats.receivedAmount)}
          icon={<CheckCircle className="h-6 w-6 text-emerald-600" />}
          iconClassName="kpi-tile-emerald"
        />
        <KpiCard
          title="Pending"
          value={formatCurrency(stats.pendingAmount)}
          icon={<Clock className="h-6 w-6 text-amber-600" />}
          iconClassName="kpi-tile-amber"
        />
        <KpiCard
          title="Total Payments"
          value={stats.totalCount}
          icon={<CreditCard className="h-6 w-6 text-violet-600" />}
          iconClassName="kpi-tile-violet"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Status</label>
                <Select
                  value={currentFilters.paymentStatus}
                  onChange={(e) => updateParams({ paymentStatus: e.target.value })}
                >
                  <option value="">All Statuses</option>
                  {PAYMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Mode</label>
                <Select
                  value={currentFilters.paymentMode}
                  onChange={(e) => updateParams({ paymentMode: e.target.value })}
                >
                  <option value="">All Modes</option>
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>{mode.replace(/_/g, " ")}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Team Member</label>
                <Select
                  value={currentFilters.teamMemberId}
                  onChange={(e) => updateParams({ teamMemberId: e.target.value })}
                >
                  <option value="">All Members</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Date Range</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={currentFilters.dateFrom}
                    onChange={(e) => updateParams({ dateFrom: e.target.value })}
                  />
                  <Input
                    type="date"
                    value={currentFilters.dateTo}
                    onChange={(e) => updateParams({ dateTo: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-transparent">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-500">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Team Member</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Mode</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Transaction ID</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{payment.customer.name}</p>
                      <p className="text-xs text-slate-500">{payment.customer.email || payment.customer.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {payment.teamMember.firstName} {payment.teamMember.lastName}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(payment.paymentDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{payment.paymentMode.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getPaymentStatusBadgeVariant(payment.paymentStatus)}>
                        {payment.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{payment.transactionId || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{truncate(payment.remarks, 30) || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">
            Showing {payments.length} of {total} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateParams({ page: (page - 1).toString() })}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateParams({ page: (page + 1).toString() })}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
