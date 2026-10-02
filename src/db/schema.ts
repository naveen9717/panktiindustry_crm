import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["MASTER_ADMIN", "TEAM_MEMBER"] }).notNull().default("TEAM_MEMBER"),
  status: text("status", { enum: ["ACTIVE", "INACTIVE", "DELETED"] }).notNull().default("ACTIVE"),
  profileImage: text("profile_image"),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  metaLeadId: text("meta_lead_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  state: text("state"),
  city: text("city"),
  leadStatus: text("lead_status", {
    enum: ["NEW", "CONTACTED", "FOLLOW_UP", "INTERESTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST", "NOT_INTERESTED"]
  }).notNull().default("NEW"),
  source: text("source"),
  campaignName: text("campaign_name"),
  adsetName: text("adset_name"),
  adName: text("ad_name"),
  formName: text("form_name"),
  customFields: text("custom_fields"),
  assignedTeamMemberId: text("assigned_team_member_id"),
  remarks: text("remarks"),
  createdById: text("created_by_id"),
  updatedById: text("updated_by_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("idx_customers_meta_lead_id").on(table.metaLeadId),
  index("idx_customers_email").on(table.email),
  index("idx_customers_phone").on(table.phone),
  index("idx_customers_lead_status").on(table.leadStatus),
  index("idx_customers_assigned_team_member").on(table.assignedTeamMemberId),
  index("idx_customers_created_at").on(table.createdAt),
  index("idx_customers_updated_at").on(table.updatedAt),
]);

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull(),
  teamMemberId: text("team_member_id").notNull(),
  amount: real("amount").notNull(),
  paymentDate: integer("payment_date", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  paymentMode: text("payment_mode", {
    enum: ["CASH", "BANK_TRANSFER", "UPI", "CREDIT_CARD", "DEBIT_CARD", "CHEQUE", "OTHER"]
  }).notNull().default("CASH"),
  paymentStatus: text("payment_status", {
    enum: ["PENDING", "PARTIAL", "PAID", "FAILED", "REFUNDED"]
  }).notNull().default("PENDING"),
  pendingAmount: real("pending_amount").notNull().default(0),
  remarks: text("remarks"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("idx_payments_customer").on(table.customerId),
  index("idx_payments_team_member").on(table.teamMemberId),
  index("idx_payments_status").on(table.paymentStatus),
  index("idx_payments_date").on(table.paymentDate),
]);

export const customerRemarks = sqliteTable("customer_remarks", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull(),
  userId: text("user_id").notNull(),
  remark: text("remark").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("idx_remarks_customer").on(table.customerId),
]);

export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  customerId: text("customer_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  description: text("description"),
  ipAddress: text("ip_address"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("idx_activity_user").on(table.userId),
  index("idx_activity_customer").on(table.customerId),
  index("idx_activity_entity").on(table.entityType, table.entityId),
  index("idx_activity_created").on(table.createdAt),
]);

export const leadImports = sqliteTable("lead_imports", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  totalRows: integer("total_rows").notNull(),
  newLeads: integer("new_leads").notNull().default(0),
  updatedLeads: integer("updated_leads").notNull().default(0),
  duplicateLeads: integer("duplicate_leads").notNull().default(0),
  failedRows: integer("failed_rows").notNull().default(0),
  status: text("status", { enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] }).notNull().default("PENDING"),
  importedBy: text("imported_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("idx_imports_created").on(table.createdAt),
]);

export const passwordResets = sqliteTable("password_resets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  assignedCustomers: many(customers, { relationName: "assignedCustomers" }),
  createdCustomers: many(customers, { relationName: "createdCustomers" }),
  updatedCustomers: many(customers, { relationName: "updatedCustomers" }),
  payments: many(payments, { relationName: "teamMemberPayments" }),
  remarks: many(customerRemarks),
  activityLogs: many(activityLogs),
  passwordResets: many(passwordResets),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  assignedTeamMember: one(users, {
    relationName: "assignedCustomers",
    fields: [customers.assignedTeamMemberId],
    references: [users.id],
  }),
  createdBy: one(users, {
    relationName: "createdCustomers",
    fields: [customers.createdById],
    references: [users.id],
  }),
  updatedBy: one(users, {
    relationName: "updatedCustomers",
    fields: [customers.updatedById],
    references: [users.id],
  }),
  payments: many(payments, { relationName: "customerPayments" }),
  remarks: many(customerRemarks),
  activityLogs: many(activityLogs),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  customer: one(customers, {
    relationName: "customerPayments",
    fields: [payments.customerId],
    references: [customers.id],
  }),
  teamMember: one(users, {
    relationName: "teamMemberPayments",
    fields: [payments.teamMemberId],
    references: [users.id],
  }),
}));

export const customerRemarksRelations = relations(customerRemarks, ({ one }) => ({
  customer: one(customers, {
    fields: [customerRemarks.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [customerRemarks.userId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [activityLogs.customerId],
    references: [customers.id],
  }),
}));

export const leadImportsRelations = relations(leadImports, ({ one }) => ({
  importedByUser: one(users, {
    fields: [leadImports.importedBy],
    references: [users.id],
  }),
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type CustomerRemark = typeof customerRemarks.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type LeadImport = typeof leadImports.$inferSelect;
export type PasswordReset = typeof passwordResets.$inferSelect;
