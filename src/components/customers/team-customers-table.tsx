"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { formatDate, formatDateTime, truncate } from "@/lib/utils";
import { Badge, getLeadStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/tables/data-table";
import { Eye, Filter } from "lucide-react";
import type { Customer, User } from "@/db/schema";

type CustomerWithRelations = Customer & {
  assignedTeamMember: Pick<User, "id" | "firstName" | "lastName" | "email"> | null;
  updatedBy: Pick<User, "id" | "firstName" | "lastName"> | null;
};

interface TeamCustomersTableProps {
  customers: CustomerWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentFilters: {
    search: string;
    leadStatus: string;
  };
}

const LEAD_STATUSES = [
  "NEW", "CONTACTED", "FOLLOW_UP", "INTERESTED", "QUALIFIED",
  "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST", "NOT_INTERESTED",
];

export function TeamCustomersTable({
  customers,
  total,
  page,
  pageSize,
  totalPages,
  currentFilters,
}: TeamCustomersTableProps) {
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
    router.push(`/team/customers?${params.toString()}`);
  };

  const columns: ColumnDef<CustomerWithRelations, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-900">{row.original.name}</p>
          <p className="text-xs text-slate-500">{row.original.email || row.original.phone}</p>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || "-",
    },
    {
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => row.original.city || "-",
    },
    {
      accessorKey: "state",
      header: "State",
      cell: ({ row }) => row.original.state || "-",
    },
    {
      accessorKey: "leadStatus",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getLeadStatusBadgeVariant(row.original.leadStatus)}>
          {row.original.leadStatus.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ row }) => truncate(row.original.remarks, 30) || "-",
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => formatDateTime(row.original.updatedAt),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Link href={`/team/customers/${row.original.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Customers</h1>
          <p className="text-sm text-slate-500">Customers assigned to you</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Status</label>
              <Select
                value={currentFilters.leadStatus}
                onChange={(e) => updateParams({ leadStatus: e.target.value })}
              >
                <option value="">All Statuses</option>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={customers}
        searchPlaceholder="Search customers..."
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
