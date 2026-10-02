"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const paymentFormSchema = z
  .object({
    customerId: z.string().min(1, "Select a customer"),
    amount: z.number().min(0, "Enter a valid amount"),
    pendingAmount: z.number().min(0, "Enter a valid amount"),
    paymentDate: z.string().min(1, "Date is required"),
    paymentMode: z.enum(["CASH", "UPI", "BANK_TRANSFER"]),
    remarks: z.string().max(1000).optional().or(z.literal("")),
  })
  .refine((data) => data.amount > 0 || data.pendingAmount > 0, {
    message: "Enter an amount received or a pending amount",
    path: ["amount"],
  });

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface CustomerOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

const MODE_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "NEFT" },
];

const today = () => new Date().toISOString().slice(0, 10);
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
const numberOrZero = (value: unknown) => {
  const n = Number(value);
  return value === "" || value === null || value === undefined || Number.isNaN(n) ? 0 : n;
};

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentFormDialog({ open, onOpenChange }: PaymentFormDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const [options, setOptions] = React.useState<CustomerOption[]>([]);
  const [query, setQuery] = React.useState("");
  const [showList, setShowList] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const selectedName = React.useRef("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      customerId: "",
      amount: 0,
      pendingAmount: 0,
      paymentDate: today(),
      paymentMode: "CASH",
      remarks: "",
    },
  });

  const selectedCustomerId = watch("customerId");

  const fetchCustomers = React.useCallback(async (search: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}&pageSize=15`);
      if (!res.ok) return;
      const data = await res.json();
      setOptions(data.customers || []);
    } catch {
      // network hiccup — keep whatever list we already have
    } finally {
      setSearching(false);
    }
  }, []);

  // Fresh form + first page of customers each time the dialog opens
  React.useEffect(() => {
    if (!open) return;
    reset({
      customerId: "",
      amount: 0,
      pendingAmount: 0,
      paymentDate: today(),
      paymentMode: "CASH",
      remarks: "",
    });
    selectedName.current = "";
    setQuery("");
    setShowList(true);
    fetchCustomers("");
  }, [open, reset, fetchCustomers]);

  // Debounced search; typing over the old pick clears the selection
  React.useEffect(() => {
    if (!open) return;
    if (query !== selectedName.current) {
      setValue("customerId", "", { shouldValidate: true });
    }
    const timer = setTimeout(() => fetchCustomers(query), 300);
    return () => clearTimeout(timer);
  }, [query, open, setValue, fetchCustomers]);

  const selectCustomer = (customer: CustomerOption) => {
    selectedName.current = customer.name;
    setQuery(customer.name);
    setShowList(false);
    setValue("customerId", customer.id, { shouldValidate: true });
  };

  const onSubmit = async (data: PaymentFormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: data.customerId,
          amount: data.amount,
          pendingAmount: data.pendingAmount,
          paymentDate: data.paymentDate,
          paymentMode: data.paymentMode,
          remarks: data.remarks || "",
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Could not add payment");
        return;
      }

      toast.success("Payment added");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Could not add payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Add Payment</DialogTitle>
        <DialogClose onClick={() => onOpenChange(false)} />
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent className="max-w-2xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="customer">Customer *</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="customer"
                  className="pl-9"
                  role="combobox"
                  aria-expanded={showList}
                  aria-controls="customer-listbox"
                  autoComplete="off"
                  placeholder="Search customer by name, email or phone"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowList(true);
                  }}
                  onFocus={() => setShowList(true)}
                  onBlur={() => setShowList(false)}
                  error={!!errors.customerId}
                />
                {showList && (
                  <ul
                    id="customer-listbox"
                    role="listbox"
                    aria-label="Customers"
                    className="picker-menu absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl py-1"
                  >
                    {searching && options.length === 0 && (
                      <li className="px-3.5 py-3 text-xs text-slate-500">Searching…</li>
                    )}
                    {!searching && options.length === 0 && (
                      <li className="px-3.5 py-3 text-xs text-slate-500">No customers found</li>
                    )}
                    {options.map((customer) => {
                      const isSelected = customer.id === selectedCustomerId;
                      return (
                        <li key={customer.id} role="option" aria-selected={isSelected}>
                          <button
                            type="button"
                            className={cn(
                              "picker-item flex w-full items-center gap-3 px-3 py-2.5 text-left",
                              isSelected && "is-selected"
                            )}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectCustomer(customer)}
                          >
                            <span className="picker-avatar">{initials(customer.name)}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-slate-900">
                                {customer.name}
                              </span>
                              <span className="block truncate text-xs text-slate-500">
                                {customer.email || customer.phone || ""}
                              </span>
                            </span>
                            {isSelected && <Check className="h-4 w-4 shrink-0 text-[#c73659]" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {errors.customerId && (
                <p className="text-xs text-red-500">{errors.customerId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount Received *</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step="any"
                placeholder="0"
                error={!!errors.amount}
                {...register("amount", { setValueAs: numberOrZero })}
              />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pendingAmount">Pending Payments</Label>
              <Input
                id="pendingAmount"
                type="number"
                min={0}
                step="any"
                placeholder="0"
                error={!!errors.pendingAmount}
                {...register("pendingAmount", { setValueAs: numberOrZero })}
              />
              {errors.pendingAmount && (
                <p className="text-xs text-red-500">{errors.pendingAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                error={!!errors.paymentDate}
                {...register("paymentDate")}
              />
              {errors.paymentDate && (
                <p className="text-xs text-red-500">{errors.paymentDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMode">Mode *</Label>
              <Select id="paymentMode" error={!!errors.paymentMode} {...register("paymentMode")}>
                {MODE_OPTIONS.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </Select>
              {errors.paymentMode && (
                <p className="text-xs text-red-500">{errors.paymentMode.message}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Notes about this payment"
                error={!!errors.remarks}
                {...register("remarks")}
              />
              {errors.remarks && <p className="text-xs text-red-500">{errors.remarks.message}</p>}
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Add Payment
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
