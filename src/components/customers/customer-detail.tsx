"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime, formatCurrency, truncate } from "@/lib/utils";
import { Badge, getLeadStatusBadgeVariant, getPaymentStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { CustomerFormDialog } from "./customer-form-dialog";
import { DeleteCustomerDialog } from "./delete-customer-dialog";
import { ArrowLeft, Pencil, Trash2, Mail, Phone, MapPin, Calendar, CreditCard, FileText } from "lucide-react";
import type { Customer, User, Payment, ActivityLog } from "@/db/schema";

type ActivityLogWithUser = ActivityLog & {
  user: Pick<User, "id" | "firstName" | "lastName"> | null;
};

type CustomerDetailType = Customer & {
  assignedTeamMember: Pick<User, "id" | "firstName" | "lastName" | "email" | "phone"> | null;
  updatedBy: Pick<User, "id" | "firstName" | "lastName"> | null;
  payments: (Payment & { teamMember: Pick<User, "id" | "firstName" | "lastName"> })[];
  activityLogs: ActivityLogWithUser[];
};

interface CustomerDetailProps {
  customer: CustomerDetailType;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export function CustomerDetail({ customer, user }: CustomerDetailProps) {
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const totalPaid = customer.payments
    .filter((p) => p.paymentStatus === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalPending = customer.payments
    .filter((p) => p.paymentStatus === "PENDING")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar firstName={customer.name.charAt(0)} lastName={customer.name.charAt(1) || ""} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
            <div className="mt-1 flex items-center gap-3">
              <Badge variant={getLeadStatusBadgeVariant(customer.leadStatus)}>
                {customer.leadStatus.replace(/_/g, " ")}
              </Badge>
              <span className="text-sm text-slate-500">ID: {customer.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm text-slate-900">{customer.email || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-sm text-slate-900">{customer.phone || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="text-sm text-slate-900">
                  {customer.address || "-"}
                  {customer.city && `, ${customer.city}`}
                  {customer.state && `, ${customer.state}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-slate-500">Lead Status</p>
              <Badge variant={getLeadStatusBadgeVariant(customer.leadStatus)}>
                {customer.leadStatus.replace(/_/g, " ")}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500">Assigned To</p>
              <p className="text-sm text-slate-900">
                {customer.assignedTeamMember
                  ? `${customer.assignedTeamMember.firstName} ${customer.assignedTeamMember.lastName}`
                  : "Unassigned"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Source</p>
              <p className="text-sm text-slate-900">{customer.source || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Created</p>
              <p className="text-sm text-slate-900">{formatDateTime(customer.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Last Updated</p>
              <p className="text-sm text-slate-900">{formatDateTime(customer.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Paid</span>
              <span className="text-lg font-semibold text-emerald-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Pending</span>
              <span className="text-lg font-semibold text-amber-600">{formatCurrency(totalPending)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Payments</span>
              <span className="text-lg font-semibold text-slate-900">{customer.payments.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remarks Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Remarks & Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.activityLogs && customer.activityLogs.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet</p>
          ) : (
            <div className="space-y-4">
              {customer.activityLogs?.map((log) => (
                <div key={log.id} className="flex gap-3 border-b border-slate-100 pb-4 last:border-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <FileText className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : "System"}
                      </p>
                      <p className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{log.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.payments.length === 0 ? (
            <p className="text-sm text-slate-500">No payments recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-2 text-left font-medium text-slate-500">Date</th>
                    <th className="pb-2 text-left font-medium text-slate-500">Amount</th>
                    <th className="pb-2 text-left font-medium text-slate-500">Mode</th>
                    <th className="pb-2 text-left font-medium text-slate-500">Status</th>
                    <th className="pb-2 text-left font-medium text-slate-500">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 text-slate-900">{formatDate(payment.paymentDate)}</td>
                      <td className="py-3 font-medium text-slate-900">{formatCurrency(payment.amount)}</td>
                      <td className="py-3 text-slate-600">{payment.paymentMode.replace(/_/g, " ")}</td>
                      <td className="py-3">
                        <Badge variant={getPaymentStatusBadgeVariant(payment.paymentStatus)}>
                          {payment.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-600">{truncate(payment.remarks, 30) || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CustomerFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        customer={customer}
        teamMembers={[]}
      />
      <DeleteCustomerDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        customer={customer}
      />
    </div>
  );
}
