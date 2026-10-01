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
  amount: z.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().optional(),
  paymentMode: paymentModeEnum.default("CASH"),
  paymentStatus: paymentStatusEnum.default("PENDING"),
  transactionId: z.string().max(100).optional().or(z.literal("")),
  remarks: z.string().max(1000).optional().or(z.literal("")),
});

export const updatePaymentSchema = createPaymentSchema.partial().extend({
  id: z.string().min(1, "Payment ID is required"),
});

export const deletePaymentSchema = z.object({
  id: z.string().min(1, "Payment ID is required"),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type DeletePaymentInput = z.infer<typeof deletePaymentSchema>;
