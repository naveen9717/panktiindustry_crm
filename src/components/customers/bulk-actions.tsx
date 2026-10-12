"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, X } from "lucide-react";
import type { User } from "@/db/schema";

type MemberOption = Pick<User, "id" | "firstName" | "lastName" | "email">;

interface BulkActionsBarProps {
  ids: string[];
  teamMembers: MemberOption[];
  onClear: () => void;
  onDone: () => void;
}

export function BulkActionsBar({ ids, teamMembers, onClear, onDone }: BulkActionsBarProps) {
  const router = useRouter();
  const [showAssign, setShowAssign] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [assignTo, setAssignTo] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  if (ids.length === 0) return null;

  const runBulk = async (
    payload: { action: "delete" | "assign"; assignedTeamMemberId?: string },
    successMsg: (count: number) => string,
    closeDialog: () => void
  ) => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, ids }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(result.error || "An error occurred");
        return;
      }
      toast.success(successMsg(result.count ?? ids.length));
      closeDialog();
      onDone();
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const noun = ids.length === 1 ? "customer" : "customers";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-transparent p-3">
        <span className="text-sm font-medium text-slate-700">
          {ids.length} {noun} selected
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-label="Bulk assign"
            onClick={() => {
              setAssignTo("");
              setShowAssign(true);
            }}
          >
            <UserPlus className="h-4 w-4" />
            Assign to Team Member
          </Button>
          <Button size="sm" variant="destructive" aria-label="Bulk delete" onClick={() => setShowDelete(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button size="sm" variant="ghost" aria-label="Clear selection" onClick={onClear}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Bulk assign dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogHeader>
          <DialogTitle>
            Assign {ids.length} {noun} to Team Member
          </DialogTitle>
          <DialogClose onClick={() => setShowAssign(false)} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-2">
            <Label htmlFor="bulkAssignMember">Team Member</Label>
            <Select id="bulkAssignMember" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
              <option value="">Select team member</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </Select>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAssign(false)}>
            Cancel
          </Button>
          <Button
            aria-label="Confirm assign"
            disabled={!assignTo || loading}
            loading={loading}
            onClick={() =>
              runBulk(
                { action: "assign", assignedTeamMemberId: assignTo },
                (count) => `${count} ${count === 1 ? "customer" : "customers"} assigned successfully`,
                () => setShowAssign(false)
              )
            }
          >
            Assign
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Bulk delete dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogHeader>
          <DialogTitle>Delete Customers</DialogTitle>
          <DialogClose onClick={() => setShowDelete(false)} />
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{" "}
            <strong>
              {ids.length} {noun}
            </strong>
            ? This action cannot be undone.
          </p>
          <p className="mt-2 text-sm text-slate-500">All associated payment records will also be deleted.</p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            aria-label="Confirm delete"
            loading={loading}
            onClick={() =>
              runBulk(
                { action: "delete" },
                (count) => `${count} ${count === 1 ? "customer" : "customers"} deleted successfully`,
                () => setShowDelete(false)
              )
            }
          >
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
