import { z } from "zod";

export const createTeamMemberSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15).optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  role: z.enum(["MASTER_ADMIN", "TEAM_MEMBER"]).default("TEAM_MEMBER"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const updateTeamMemberSchema = z.object({
  id: z.string().min(1, "Team member ID is required"),
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional().or(z.literal("")),
  role: z.enum(["MASTER_ADMIN", "TEAM_MEMBER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const deleteTeamMemberSchema = z.object({
  id: z.string().min(1, "Team member ID is required"),
  reassignToId: z.string().optional().or(z.literal("")),
  action: z.enum(["deactivate", "delete"]).default("deactivate"),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15).optional().or(z.literal("")),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type DeleteTeamMemberInput = z.infer<typeof deleteTeamMemberSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
