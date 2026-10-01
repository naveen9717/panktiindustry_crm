"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { formatDate, formatDateTime, truncate } from "@/lib/utils";
import { Badge, getLeadStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/tables/data-table";
import { ArrowLeft, Eye } from "lucide-react";
import type { Customer, User } from "@/db/schema";

type CustomerWithRelations = Customer & {
  assignedTeamMember: Pick<User, "id" | "firstName" | "lastName" | "email"> | null;
  updatedBy: Pick<User, "id" | "firstName" | "lastName"> | null;
};

interface TeamMemberCustomersTableProps {
  member: Pick<User, "id" | "firstName" | "lastName" | "email">;
  customers: CustomerWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentFilters: { search: string };
}

export function TeamMemberCustomersTable({
  member,
  customers,
  total,
  page,
  pageSize,
  totalPages,
  currentFilters,
}: TeamMemberCustomersTableProps) {
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
    router.push(`/admin/team-members/${member.id}/customers?${params.toString()}`);
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
        <Link href={`/admin/customers/${row.original.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
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
          {member.firstName} {member.lastName}&apos;s Customers
        </h1>
        <p className="text-sm text-slate-500">
          {total} customers assigned to this team member
        </p>
      </div>

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
