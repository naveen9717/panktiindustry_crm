"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Customer, User } from "@/db/schema";

const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone must be at least 10 digits").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  leadStatus: z.enum([
    "NEW", "CONTACTED", "FOLLOW_UP", "INTERESTED", "QUALIFIED",
    "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST", "NOT_INTERESTED",
  ]),
  source: z.string().optional().or(z.literal("")),
  remarks: z.string().optional().or(z.literal("")),
  assignedTeamMemberId: z.string().optional().or(z.literal("")),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: (Customer & { assignedTeamMember: Pick<User, "id" | "firstName" | "lastName"> | null }) | null;
  teamMembers: Pick<User, "id" | "firstName" | "lastName" | "email">[];
}

export function CustomerFormDialog({ open, onOpenChange, customer, teamMembers }: CustomerFormDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      state: "",
      city: "",
      leadStatus: "NEW",
      source: "",
      remarks: "",
      assignedTeamMemberId: "",
    },
  });

  React.useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        state: customer.state || "",
        city: customer.city || "",
        leadStatus: customer.leadStatus,
        source: customer.source || "",
        remarks: customer.remarks || "",
        assignedTeamMemberId: customer.assignedTeamMemberId || "",
      });
    } else {
      reset({
        name: "",
        email: "",
        phone: "",
        address: "",
        state: "",
        city: "",
        leadStatus: "NEW",
        source: "",
        remarks: "",
        assignedTeamMemberId: "",
      });
    }
  }, [customer, reset, open]);

  const onSubmit = async (data: CustomerFormValues) => {
    setLoading(true);
    try {
      const url = customer ? `/api/customers/${customer.id}` : "/api/customers";
      const method = customer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "An error occurred");
        return;
      }

      toast.success(customer ? "Customer updated successfully" : "Customer created successfully");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{customer ? "Edit Customer" : "Add Customer"}</DialogTitle>
        <DialogClose onClick={() => onOpenChange(false)} />
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent className="max-w-2xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" error={!!errors.name} {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" error={!!errors.email} {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" error={!!errors.phone} {...register("phone")} />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadStatus">Lead Status</Label>
              <Select id="leadStatus" {...register("leadStatus")}>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="INTERESTED">Interested</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="PROPOSAL_SENT">Proposal Sent</option>
                <option value="NEGOTIATION">Negotiation</option>
                <option value="CONVERTED">Converted</option>
                <option value="LOST">Lost</option>
                <option value="NOT_INTERESTED">Not Interested</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedTeamMemberId">Assign To</Label>
              <Select id="assignedTeamMemberId" {...register("assignedTeamMemberId")}>
                <option value="">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input id="source" {...register("source")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register("state")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" {...register("remarks")} />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {customer ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
