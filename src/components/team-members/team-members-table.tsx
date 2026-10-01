"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge, getUserStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/tables/data-table";
import { TeamMemberFormDialog } from "./team-member-form-dialog";
import { DeleteTeamMemberDialog } from "./delete-team-member-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { Plus, Eye, Pencil, Trash2, Users, CreditCard, UserCheck, Key, Search } from "lucide-react";
import type { User } from "@/db/schema";

type TeamMemberWithStats = Pick<User, "id" | "firstName" | "lastName" | "email" | "phone" | "role" | "status" | "profileImage" | "lastLoginAt" | "createdAt" | "updatedAt"> & {
  _count: { assignedCustomers: number };
  activeLeads: number;
  convertedLeads: number;
  paymentsReceived: number;
};

interface TeamMembersTableProps {
  members: TeamMemberWithStats[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentFilters: {
    search: string;
    status: string;
  };
}

export function TeamMembersTable({ members, total, page, pageSize, totalPages, currentFilters }: TeamMembersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<TeamMemberWithStats | null>(null);

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
    router.push(`/admin/team-members?${params.toString()}`);
  };

  const columns: ColumnDef<TeamMemberWithStats, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-900">
            {row.original.firstName} {row.original.lastName}
          </p>
          <p className="text-xs text-slate-500">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || "-",
    },
    {
      accessorKey: "_count",
      header: "Customers",
      cell: ({ row }) => row.original._count.assignedCustomers,
    },
    {
      accessorKey: "activeLeads",
      header: "Active Leads",
      cell: ({ row }) => row.original.activeLeads,
    },
    {
      accessorKey: "convertedLeads",
      header: "Converted",
      cell: ({ row }) => row.original.convertedLeads,
    },
    {
      accessorKey: "paymentsReceived",
      header: "Payments",
      cell: ({ row }) => formatCurrency(row.original.paymentsReceived),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getUserStatusBadgeVariant(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last Login",
      cell: ({ row }) => (row.original.lastLoginAt ? formatDate(row.original.lastLoginAt) : "Never"),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link href={`/admin/team-members/${row.original.id}/customers`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Users className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/admin/team-members/${row.original.id}/payments`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <CreditCard className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedMember(row.original);
              setShowAddDialog(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedMember(row.original);
              setShowResetDialog(true);
            }}
          >
            <Key className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={() => {
              setSelectedMember(row.original);
              setShowDeleteDialog(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-sm text-slate-500">Manage your team members and their permissions</p>
        </div>
        <Button size="sm" onClick={() => {
          setSelectedMember(null);
          setShowAddDialog(true);
        }}>
          <Plus className="h-4 w-4" />
          Add Team Member
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search members..."
              value={currentFilters.search}
              onChange={(e) => updateParams({ search: e.target.value })}
              className="pl-9"
            />
          </div>
          <Select
            value={currentFilters.status}
            onChange={(e) => updateParams({ status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={members}
        totalItems={total}
        pageSize={pageSize}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => updateParams({ page: p.toString() })}
      />

      {/* Dialogs */}
      <TeamMemberFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        member={selectedMember}
      />
      <DeleteTeamMemberDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        member={selectedMember}
      />
      <ResetPasswordDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        member={selectedMember}
      />
    </div>
  );
}
