"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/db/schema";

interface DeleteCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function DeleteCustomerDialog({ open, onOpenChange, customer }: DeleteCustomerDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    if (!customer) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "An error occurred");
        return;
      }

      toast.success("Customer deleted successfully");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Delete Customer</DialogTitle>
        <DialogClose onClick={() => onOpenChange(false)} />
      </DialogHeader>
      <DialogContent>
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <strong>{customer.name}</strong>? This action cannot be undone.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          All associated payment records will also be deleted.
        </p>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleDelete} loading={loading}>
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
