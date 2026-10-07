"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { formatDate, formatDateTime, truncate } from "@/lib/utils";
import { Badge, getLeadStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DataTable } from "@/components/tables/data-table";
import { Eye, Filter, Pencil } from "lucide-react";
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
    state: string;
    city: string;
    dateFrom: string;
    dateTo: string;
  };
}

const LEAD_STATUSES = [
  "NEW", "CONTACTED", "FOLLOW_UP", "MORE_DETAILS_SEND", "RINGING", "PHONE_OFF", "BUSY", "INTERESTED", "QUALIFIED",
  "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST", "NOT_INTERESTED",
];

const editSchema = z.object({
  leadStatus: z.enum([
    "NEW", "CONTACTED", "FOLLOW_UP", "MORE_DETAILS_SEND", "RINGING", "PHONE_OFF", "BUSY", "INTERESTED", "QUALIFIED",
    "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST", "NOT_INTERESTED",
  ]),
  remarks: z.string().max(2000).optional().or(z.literal("")),
});

type EditFormData = z.infer<typeof editSchema>;

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
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerWithRelations | null>(null);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { leadStatus: "NEW", remarks: "" },
  });

  const openEditDialog = (customer: CustomerWithRelations) => {
    setSelectedCustomer(customer);
    editForm.reset({ leadStatus: customer.leadStatus, remarks: customer.remarks || "" });
    setShowEditDialog(true);
  };

  const onEditSubmit = async (data: EditFormData) => {
    if (!selectedCustomer) return;
    setLoading(true);
    try {
      const newRemarks = data.remarks || "";
      const statusChanged = data.leadStatus !== selectedCustomer.leadStatus;
      const remarksChanged = newRemarks !== (selectedCustomer.remarks || "");

      if (!statusChanged && !remarksChanged) {
        setShowEditDialog(false);
        return;
      }

      if (statusChanged) {
        const res = await fetch(`/api/customers/${selectedCustomer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadStatus: data.leadStatus }),
        });
        if (!res.ok) {
          toast.error("Failed to update status");
          return;
        }
      }

      if (remarksChanged) {
        const res = await fetch(`/api/customers/${selectedCustomer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remarks: newRemarks }),
        });
        if (!res.ok) {
          toast.error("Failed to update remarks");
          return;
        }
      }

      toast.success("Customer updated successfully");
      setShowEditDialog(false);
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex items-center gap-1">
          <Link href={`/team/customers/${row.original.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Edit customer"
            onClick={() => openEditDialog(row.original)}
          >
            <Pencil className="h-4 w-4" />
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
        <div className="rounded-lg border border-slate-200 bg-transparent p-4">
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
        searchPlaceholder="Search customers..."
        searchKey="search"
        totalItems={total}
        pageSize={pageSize}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => updateParams({ page: p.toString() })}
      />

      {/* Edit Customer Dialog (status + remarks) */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogClose onClick={() => setShowEditDialog(false)} />
        </DialogHeader>
        <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
          <DialogContent>
            <div className="space-y-2">
              <Label htmlFor="editCustomerStatus">Status</Label>
              <Select id="editCustomerStatus" {...editForm.register("leadStatus")}>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCustomerRemarks">Remarks</Label>
              <Textarea
                id="editCustomerRemarks"
                placeholder="Add remarks..."
                rows={3}
                {...editForm.register("remarks")}
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
