import { z } from "zod";

export const leadStatusEnum = z.enum([
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "INTERESTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "CONVERTED",
  "LOST",
  "NOT_INTERESTED",
]);

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  leadStatus: leadStatusEnum.default("NEW"),
  source: z.string().max(100).optional().or(z.literal("")),
  remarks: z.string().max(2000).optional().or(z.literal("")),
  assignedTeamMemberId: z.string().optional().or(z.literal("")),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  id: z.string().min(1, "Customer ID is required"),
});

export const updateCustomerRemarksSchema = z.object({
  id: z.string().min(1, "Customer ID is required"),
  remarks: z.string().max(2000).optional().or(z.literal("")),
});

export const updateCustomerStatusSchema = z.object({
  id: z.string().min(1, "Customer ID is required"),
  leadStatus: leadStatusEnum,
});

export const assignCustomerSchema = z.object({
  id: z.string().min(1, "Customer ID is required"),
  assignedTeamMemberId: z.string().optional().or(z.literal("")),
});

export const deleteCustomerSchema = z.object({
  id: z.string().min(1, "Customer ID is required"),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type UpdateCustomerRemarksInput = z.infer<typeof updateCustomerRemarksSchema>;
export type UpdateCustomerStatusInput = z.infer<typeof updateCustomerStatusSchema>;
export type AssignCustomerInput = z.infer<typeof assignCustomerSchema>;
export type DeleteCustomerInput = z.infer<typeof deleteCustomerSchema>;
