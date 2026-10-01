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
import { CustomerFormDialog } from "./customer-form-dialog";
import { DeleteCustomerDialog } from "./delete-customer-dialog";
import { ImportDialog } from "./import-dialog";
import { Eye, Pencil, Trash2, Plus, Filter, Download, Upload } from "lucide-react";
import type { Customer, User } from "@/db/schema";

type CustomerWithRelations = Customer & {
  assignedTeamMember: Pick<User, "id" | "firstName" | "lastName" | "email"> | null;
  updatedBy: Pick<User, "id" | "firstName" | "lastName"> | null;
};

interface CustomersTableProps {
  customers: CustomerWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  teamMembers: Pick<User, "id" | "firstName" | "lastName" | "email">[];
  currentFilters: {
    search: string;
    leadStatus: string;
    assignedTeamMemberId: string;
    state: string;
    city: string;
    dateFrom: string;
    dateTo: string;
    sortBy: string;
    sortOrder: string;
  };
}

const LEAD_STATUSES = [
  "NEW", "CONTACTED", "FOLLOW_UP", "INTERESTED", "QUALIFIED",
  "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST", "NOT_INTERESTED",
];

export function CustomersTable({
  customers,
  total,
  page,
  pageSize,
  totalPages,
  teamMembers,
  currentFilters,
}: CustomersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = React.useState(false);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showImportDialog, setShowImportDialog] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerWithRelations | null>(null);

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
    router.push(`/admin/customers?${params.toString()}`);
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
      accessorKey: "assignedTeamMember",
      header: "Assigned To",
      cell: ({ row }) =>
        row.original.assignedTeamMember
          ? `${row.original.assignedTeamMember.firstName} ${row.original.assignedTeamMember.lastName}`
          : "Unassigned",
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
        <div className="flex items-center gap-1">
          <Link href={`/admin/customers/${row.original.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedCustomer(row.original);
              setShowAddDialog(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={() => {
              setSelectedCustomer(row.original);
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
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Manage your customers and leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => {
            setSelectedCustomer(null);
            setShowAddDialog(true);
          }}>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Team Member</label>
              <Select
                value={currentFilters.assignedTeamMemberId}
                onChange={(e) => updateParams({ assignedTeamMemberId: e.target.value })}
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
              <label className="mb-1 block text-xs font-medium text-slate-700">State</label>
              <Input
                placeholder="Filter by state"
                value={currentFilters.state}
                onChange={(e) => updateParams({ state: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">City</label>
              <Input
                placeholder="Filter by city"
                value={currentFilters.city}
                onChange={(e) => updateParams({ city: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Date From</label>
              <Input
                type="date"
                value={currentFilters.dateFrom}
                onChange={(e) => updateParams({ dateFrom: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Date To</label>
              <Input
                type="date"
                value={currentFilters.dateTo}
                onChange={(e) => updateParams({ dateTo: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={customers}
        searchPlaceholder="Search by name, email, phone..."
        searchKey="search"
        totalItems={total}
        pageSize={pageSize}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => updateParams({ page: p.toString() })}
      />

      {/* Dialogs */}
      <CustomerFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        customer={selectedCustomer}
        teamMembers={teamMembers}
      />
      <DeleteCustomerDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        customer={selectedCustomer}
      />
      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />
    </div>
  );
}
