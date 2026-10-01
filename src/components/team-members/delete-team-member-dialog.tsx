"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import type { User } from "@/db/schema";

interface DeleteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Pick<User, "id" | "firstName" | "lastName" | "email"> | null;
}

export function DeleteTeamMemberDialog({ open, onOpenChange, member }: DeleteTeamMemberDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [action, setAction] = React.useState<"deactivate" | "delete">("deactivate");
  const [reassignToId, setReassignToId] = React.useState("");

  const handleDelete = async () => {
    if (!member) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/team-members/${member.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reassignToId: reassignToId || undefined }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "An error occurred");
        return;
      }

      toast.success(action === "deactivate" ? "Team member deactivated" : "Team member deleted");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Delete Team Member</DialogTitle>
        <DialogClose onClick={() => onOpenChange(false)} />
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Are you sure you want to delete {member.firstName} {member.lastName}?
              </p>
              <p className="mt-1 text-xs text-amber-700">
                This action cannot be undone. Their customers will need to be reassigned.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Action</label>
            <Select value={action} onChange={(e) => setAction(e.target.value as "deactivate" | "delete")}>
              <option value="deactivate">Deactivate (recommended)</option>
              <option value="delete">Permanently Delete</option>
            </Select>
          </div>

          {action === "delete" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Reassign customers to</label>
              <Select value={reassignToId} onChange={(e) => setReassignToId(e.target.value)}>
                <option value="">Keep unassigned</option>
                <option value="admin">Assign to Admin</option>
              </Select>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleDelete} loading={loading}>
          {action === "deactivate" ? "Deactivate" : "Delete"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
