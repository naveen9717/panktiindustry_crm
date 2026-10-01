import type { User } from "@/db/schema";

export type Permission =
  | "customers:view"
  | "customers:create"
  | "customers:edit"
  | "customers:delete"
  | "customers:assign"
  | "customers:import"
  | "customers:export"
  | "team-members:view"
  | "team-members:create"
  | "team-members:edit"
  | "team-members:delete"
  | "payments:view"
  | "payments:create"
  | "payments:edit"
  | "settings:view"
  | "settings:edit";

const MASTER_ADMIN_PERMISSIONS: Permission[] = [
  "customers:view",
  "customers:create",
  "customers:edit",
  "customers:delete",
  "customers:assign",
  "customers:import",
  "customers:export",
  "team-members:view",
  "team-members:create",
  "team-members:edit",
  "team-members:delete",
  "payments:view",
  "payments:create",
  "payments:edit",
  "settings:view",
  "settings:edit",
];

const TEAM_MEMBER_PERMISSIONS: Permission[] = [
  "customers:view",
  "customers:edit",
  "payments:view",
  "settings:view",
  "settings:edit",
];

export function getPermissionsForRole(role: string): Permission[] {
  if (role === "MASTER_ADMIN") return MASTER_ADMIN_PERMISSIONS;
  return TEAM_MEMBER_PERMISSIONS;
}

export function hasPermission(user: User, permission: Permission): boolean {
  const permissions = getPermissionsForRole(user.role);
  return permissions.includes(permission);
}

export function isMasterAdmin(user: User): boolean {
  return user.role === "MASTER_ADMIN";
}

export function canViewCustomer(user: User, customerAssignedToId: string | null): boolean {
  if (user.role === "MASTER_ADMIN") return true;
  return customerAssignedToId === user.id;
}

export function canViewPayment(user: User, paymentTeamMemberId: string): boolean {
  if (user.role === "MASTER_ADMIN") return true;
  return paymentTeamMemberId === user.id;
}
