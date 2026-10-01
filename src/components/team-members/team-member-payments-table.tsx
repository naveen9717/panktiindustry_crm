"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, formatCurrency, truncate } from "@/lib/utils";
import { Badge, getPaymentStatusBadgeVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/tables/data-table";
import { ArrowLeft } from "lucide-react";
import type { Payment, User, Customer } from "@/db/schema";

type PaymentWithRelations = Payment & {
  customer: Pick<Customer, "id" | "name" | "email" | "phone">;
  teamMember: Pick<User, "id" | "firstName" | "lastName">;
};

interface TeamMemberPaymentsTableProps {
  member: Pick<User, "id" | "firstName" | "lastName" | "email">;
  payments: PaymentWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentFilters: { search: string };
}

export function TeamMemberPaymentsTable({
  member,
  payments,
  total,
  page,
  pageSize,
  totalPages,
  currentFilters,
}: TeamMemberPaymentsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    router.push(`/admin/team-members/${member.id}/payments?${params.toString()}`);
  };

  const columns: ColumnDef<PaymentWithRelations>[] = [
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
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to team members
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {member.firstName} {member.lastName}&apos;s Payments
        </h1>
        <p className="text-sm text-slate-500">
          {total} payments for this team member
        </p>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        searchPlaceholder="Search payments..."
        searchKey="search"
        totalItems={total}
        pageSize={pageSize}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => updateParams({ page: p.toString() })}
      />
    </div>
  );
}
