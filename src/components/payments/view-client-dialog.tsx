"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge, getLeadStatusBadgeVariant, getPaymentStatusBadgeVariant } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";

interface ClientPayment {
  id: string;
  amount: number;
  pendingAmount: number;
  paymentDate: string;
  paymentMode: string;
  paymentStatus: string;
  remarks?: string | null;
  teamMember?: { id: string; firstName: string; lastName: string } | null;
}

interface ClientActivity {
  id: string;
  action: string;
  description?: string | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string } | null;
}

interface ClientRemark {
  id: string;
  remark: string;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string } | null;
}

interface ClientDetail {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  state?: string | null;
  city?: string | null;
  leadStatus: string;
  source?: string | null;
  campaignName?: string | null;
  adsetName?: string | null;
  adName?: string | null;
  formName?: string | null;
  metaLeadId?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTeamMember?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  payments?: ClientPayment[];
  activityLogs?: ClientActivity[];
  remarkHistory?: ClientRemark[];
}

interface ViewClientDialogProps {
  customerId: string | null;
  onClose: () => void;
}

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-900">
        {value === null || value === undefined || value === "" ? (
          <span className="text-slate-400">—</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">{children}</h3>
  );
}

export function ViewClientDialog({ customerId, onClose }: ViewClientDialogProps) {
  const [client, setClient] = React.useState<ClientDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!customerId) {
      setClient(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/customers/${customerId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setClient(data.customer as ClientDetail);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load client details");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const payments = (client?.payments || []).slice().reverse();
  const activities = (client?.activityLogs || []).slice(0, 6);
  const remarks = (client?.remarkHistory || []).slice(0, 6);

  return (
    <Dialog open={!!customerId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogHeader>
        <DialogTitle>Client Details</DialogTitle>
        <DialogClose onClick={onClose} />
      </DialogHeader>

      <DialogContent className="max-w-2xl">
        {loading && (
          <p className="py-8 text-center text-sm text-slate-500">Loading client details…</p>
        )}

        {!loading && error && (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        )}

        {!loading && !error && client && (
          <div className="space-y-6">
            {/* Identity */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{client.name}</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {client.email || client.phone || "No contact details"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant={getLeadStatusBadgeVariant(client.leadStatus)}>
                  {client.leadStatus.replace(/_/g, " ")}
                </Badge>
                <Link
                  href={`/admin/customers/${client.id}`}
                  className="text-xs font-medium text-emerald-600 hover:underline"
                >
                  Open full profile →
                </Link>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <SectionTitle>Contact</SectionTitle>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Email" value={client.email} />
                <Field label="Phone" value={client.phone} />
                <Field label="Address" value={client.address} wide />
                <Field label="City" value={client.city} />
                <Field label="State" value={client.state} />
              </dl>
            </div>

            {/* Lead / Meta */}
            <div className="space-y-3">
              <SectionTitle>Lead Information</SectionTitle>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Lead Status" value={client.leadStatus.replace(/_/g, " ")} />
                <Field label="Source" value={client.source} />
                <Field label="Campaign" value={client.campaignName} />
                <Field label="Ad Set" value={client.adsetName} />
                <Field label="Ad" value={client.adName} />
                <Field label="Form" value={client.formName} />
                <Field label="Meta Lead ID" value={client.metaLeadId} />
                <Field
                  label="Assigned To"
                  value={
                    client.assignedTeamMember
                      ? `${client.assignedTeamMember.firstName} ${client.assignedTeamMember.lastName}`
                      : "Unassigned"
                  }
                />
                <Field label="Created" value={formatDate(client.createdAt)} />
                <Field label="Last Updated" value={formatDate(client.updatedAt)} />
                <Field label="Remarks" value={client.remarks} wide />
              </dl>
            </div>

            {/* Payments */}
            <div className="space-y-3">
              <SectionTitle>Payment History ({payments.length})</SectionTitle>
              {payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                      <span className="w-24 text-slate-500">{formatDate(payment.paymentDate)}</span>
                      <span className="font-medium text-slate-900">{formatCurrency(payment.amount)}</span>
                      {payment.pendingAmount > 0 && (
                        <span className="text-amber-600">
                          {formatCurrency(payment.pendingAmount)} pending
                        </span>
                      )}
                      <span className="text-slate-600">{payment.paymentMode.replace(/_/g, " ")}</span>
                      <Badge variant={getPaymentStatusBadgeVariant(payment.paymentStatus)}>
                        {payment.paymentStatus}
                      </Badge>
                      {payment.teamMember && (
                        <span className="text-xs text-slate-500">
                          by {payment.teamMember.firstName} {payment.teamMember.lastName}
                        </span>
                      )}
                      {payment.remarks && (
                        <span className="w-full text-xs text-slate-500">{payment.remarks}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Remarks history */}
            {remarks.length > 0 && (
              <div className="space-y-3">
                <SectionTitle>Remark History</SectionTitle>
                <ul className="divide-y divide-slate-100">
                  {remarks.map((remark) => (
                    <li key={remark.id} className="py-2.5 text-sm">
                      <p className="text-slate-700">{remark.remark}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {remark.user ? `${remark.user.firstName} ${remark.user.lastName} · ` : ""}
                        {formatDate(remark.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Activity */}
            {activities.length > 0 && (
              <div className="space-y-3">
                <SectionTitle>Recent Activity</SectionTitle>
                <ul className="divide-y divide-slate-100">
                  {activities.map((activity) => (
                    <li key={activity.id} className="py-2.5 text-sm">
                      <p className="text-slate-700">
                        {activity.description || activity.action.replace(/_/g, " ").toLowerCase()}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {activity.user ? `${activity.user.firstName} ${activity.user.lastName} · ` : ""}
                        {formatDate(activity.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
