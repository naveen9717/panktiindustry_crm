import { z } from "zod";

export const paymentModeEnum = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "UPI",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "CHEQUE",
  "OTHER",
]);

export const paymentStatusEnum = z.enum([
  "PENDING",
  "PARTIAL",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

export const createPaymentSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  amount: z.number().min(0, "Amount received must be 0 or more"),
  pendingAmount: z.number().min(0, "Pending amount must be 0 or more").optional().default(0),
  paymentDate: z.string().optional(),
  paymentMode: paymentModeEnum.default("CASH"),
  paymentStatus: paymentStatusEnum.optional(),
  remarks: z.string().max(1000).optional().or(z.literal("")),
});

/* Adding a payment must record at least something: money in, or money owed */
export const addPaymentSchema = createPaymentSchema.refine(
  (data) => data.amount > 0 || data.pendingAmount > 0,
  { message: "Enter an amount received or a pending amount", path: ["amount"] }
);

export const updatePaymentSchema = createPaymentSchema.partial().extend({
  id: z.string().min(1, "Payment ID is required"),
});

export const deletePaymentSchema = z.object({
  id: z.string().min(1, "Payment ID is required"),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type DeletePaymentInput = z.infer<typeof deletePaymentSchema>;
