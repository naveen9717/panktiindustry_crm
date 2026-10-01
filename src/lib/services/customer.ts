import type { DB } from "@/db";
import { customers, customerRemarks, activityLogs } from "@/db/schema";
import { eq, and, or, like, desc, asc, sql, count, sum, type SQL } from "drizzle-orm";
import { logActivity } from "./activity";

interface CreateCustomerParams {
  db: DB;
  data: {
    metaLeadId?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    state?: string | null;
    city?: string | null;
    leadStatus?: string;
    source?: string | null;
    campaignName?: string | null;
    adsetName?: string | null;
    adName?: string | null;
    formName?: string | null;
    customFields?: string | null;
    remarks?: string | null;
    assignedTeamMemberId?: string | null;
  };
  userId: string;
  ipAddress?: string | null;
}

export async function createCustomer({ db, data, userId, ipAddress }: CreateCustomerParams) {
  const id = crypto.randomUUID();
  await db.insert(customers).values({
    id,
    metaLeadId: data.metaLeadId || null,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    state: data.state || null,
    city: data.city || null,
    leadStatus: (data.leadStatus as typeof customers.$inferSelect.leadStatus) || "NEW",
    source: data.source || null,
    campaignName: data.campaignName || null,
    adsetName: data.adsetName || null,
    adName: data.adName || null,
    formName: data.formName || null,
    customFields: data.customFields || null,
    remarks: data.remarks || null,
    assignedTeamMemberId: data.assignedTeamMemberId || null,
    createdById: userId,
    updatedById: userId,
  });

  await logActivity({
    db,
    userId,
    action: "CUSTOMER_CREATED",
    entityType: "Customer",
    entityId: id,
    description: `Customer "${data.name}" was created`,
    ipAddress,
  });

  return { id, ...data };
}

interface UpdateCustomerParams {
  db: DB;
  id: string;
  data: Partial<typeof customers.$inferInsert>;
  userId: string;
  ipAddress?: string | null;
}

export async function updateCustomer({ db, id, data, userId, ipAddress }: UpdateCustomerParams) {
  await db.update(customers)
    .set({ ...data, updatedById: userId, updatedAt: new Date() })
    .where(eq(customers.id, id));

  await logActivity({
    db,
    userId,
    action: "CUSTOMER_UPDATED",
    entityType: "Customer",
    entityId: id,
    description: `Customer was updated`,
    ipAddress,
  });
}

interface UpdateRemarksParams {
  db: DB;
  id: string;
  remarks: string;
  userId: string;
  ipAddress?: string | null;
}

export async function updateCustomerRemarks({ db, id, remarks, userId, ipAddress }: UpdateRemarksParams) {
  const existing = await db.query.customers.findFirst({
    where: eq(customers.id, id),
  });
  if (!existing) throw new Error("Customer not found");

  // Update customer remarks
  await db.update(customers)
    .set({ remarks, updatedById: userId, updatedAt: new Date() })
    .where(eq(customers.id, id));

  // Create remark history record
  await db.insert(customerRemarks).values({
    id: crypto.randomUUID(),
    customerId: id,
    userId,
    remark: remarks,
  });

  // Log activity
  await logActivity({
    db,
    userId,
    action: "REMARK_UPDATED",
    entityType: "Customer",
    entityId: id,
    description: `Remark updated for customer "${existing.name}"`,
    ipAddress,
  });
}

interface UpdateStatusParams {
  db: DB;
  id: string;
  leadStatus: string;
  userId: string;
  ipAddress?: string | null;
}

export async function updateCustomerStatus({ db, id, leadStatus, userId, ipAddress }: UpdateStatusParams) {
  const existing = await db.query.customers.findFirst({
    where: eq(customers.id, id),
  });
  if (!existing) throw new Error("Customer not found");

  await db.update(customers)
    .set({ leadStatus: leadStatus as typeof customers.$inferSelect.leadStatus, updatedById: userId, updatedAt: new Date() })
    .where(eq(customers.id, id));

  await logActivity({
    db,
    userId,
    action: "STATUS_CHANGED",
    entityType: "Customer",
    entityId: id,
    description: `Status changed from ${existing.leadStatus} to ${leadStatus}`,
    ipAddress,
  });
}

interface AssignCustomerParams {
  db: DB;
  id: string;
  assignedTeamMemberId: string | null;
  userId: string;
  ipAddress?: string | null;
}

export async function assignCustomer({ db, id, assignedTeamMemberId, userId, ipAddress }: AssignCustomerParams) {
  const existing = await db.query.customers.findFirst({
    where: eq(customers.id, id),
  });
  if (!existing) throw new Error("Customer not found");

  await db.update(customers)
    .set({ assignedTeamMemberId, updatedById: userId, updatedAt: new Date() })
    .where(eq(customers.id, id));

  await logActivity({
    db,
    userId,
    action: "CUSTOMER_ASSIGNED",
    entityType: "Customer",
    entityId: id,
    description: `Customer "${existing.name}" assigned to team member`,
    ipAddress,
  });
}

interface DeleteCustomerParams {
  db: DB;
  id: string;
  userId: string;
  ipAddress?: string | null;
}

export async function deleteCustomer({ db, id, userId, ipAddress }: DeleteCustomerParams) {
  const existing = await db.query.customers.findFirst({
    where: eq(customers.id, id),
  });
  if (!existing) throw new Error("Customer not found");

  await db.delete(customers).where(eq(customers.id, id));

  await logActivity({
    db,
    userId,
    action: "CUSTOMER_DELETED",
    entityType: "Customer",
    entityId: id,
    description: `Customer "${existing.name}" was deleted`,
    ipAddress,
  });
}

interface GetCustomersParams {
  db: DB;
  page?: number;
  pageSize?: number;
  search?: string;
  leadStatus?: string;
  assignedTeamMemberId?: string;
  state?: string;
  city?: string;
  campaign?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  userId?: string;
  userRole?: string;
}

export async function getCustomers({
  db,
  page = 1,
  pageSize = 25,
  search,
  leadStatus,
  assignedTeamMemberId,
  state,
  city,
  campaign,
  dateFrom,
  dateTo,
  sortBy = "createdAt",
  sortOrder = "desc",
  userId,
  userRole,
}: GetCustomersParams) {
  const conditions: SQL[] = [];

  // Role-based filtering
  if (userRole === "TEAM_MEMBER" && userId) {
    conditions.push(eq(customers.assignedTeamMemberId, userId));
  } else if (assignedTeamMemberId) {
    conditions.push(eq(customers.assignedTeamMemberId, assignedTeamMemberId));
  }

  if (search) {
    conditions.push(or(
        like(customers.name, `%${search}%`),
        like(customers.email, `%${search}%`),
        like(customers.phone, `%${search}%`),
        like(customers.metaLeadId, `%${search}%`),
        like(customers.id, `%${search}%`)
      )!);
  }

  if (leadStatus) conditions.push(eq(customers.leadStatus, leadStatus as typeof customers.$inferSelect.leadStatus));
  if (state) conditions.push(like(customers.state, `%${state}%`));
  if (city) conditions.push(like(customers.city, `%${city}%`));
  if (campaign) conditions.push(like(customers.campaignName, `%${campaign}%`));

  if (dateFrom) {
    conditions.push(sql`${customers.createdAt} >= ${Math.floor(new Date(dateFrom).getTime() / 1000)}`);
  }
  if (dateTo) {
    conditions.push(sql`${customers.createdAt} <= ${Math.floor(new Date(dateTo).getTime() / 1000)}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const offset = (page - 1) * pageSize;

  const [customersList, totalResult] = await Promise.all([
    db.query.customers.findMany({
      where: whereClause,
      with: {
        assignedTeamMember: {
          columns: { id: true, firstName: true, lastName: true, email: true },
        },
        updatedBy: {
          columns: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: sortOrder === "desc" ? desc(customers.createdAt) : asc(customers.createdAt),
      limit: pageSize,
      offset,
    }),
    db.select({ count: count() }).from(customers).where(whereClause),
  ]);

  const total = totalResult[0]?.count || 0;

  return {
    customers: customersList,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCustomerById(db: DB, id: string, userId?: string, userRole?: string) {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, id),
    with: {
      assignedTeamMember: {
        columns: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
      updatedBy: {
        columns: { id: true, firstName: true, lastName: true },
      },
      payments: {
        with: {
          teamMember: {
            columns: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!customer) return null;

  // IDOR protection
  if (userRole === "TEAM_MEMBER" && userId && customer.assignedTeamMemberId !== userId) {
    return null;
  }

  // Fetch activity logs separately
  const activities = await db.query.activityLogs.findMany({
    where: and(
      eq(activityLogs.entityType, "Customer"),
      eq(activityLogs.entityId, id)
    ),
    with: {
      user: {
        columns: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: desc(activityLogs.createdAt),
    limit: 50,
  });

  // Fetch remark history
  const remarkHistory = await db.query.customerRemarks.findMany({
    where: eq(customerRemarks.customerId, id),
    with: {
      user: {
        columns: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: desc(customerRemarks.createdAt),
    limit: 50,
  });

  return { ...customer, activityLogs: activities, remarkHistory };
}

export async function getCustomerStats(db: DB, userId?: string, userRole?: string) {
  const conditions: SQL[] = [];
  if (userRole === "TEAM_MEMBER" && userId) {
    conditions.push(eq(customers.assignedTeamMemberId, userId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [
    total,
    active,
    converted,
    newLeads,
    contacted,
    followUp,
    interested,
    qualified,
    proposalSent,
    negotiation,
    lost,
    notInterested,
  ] = await Promise.all([
    db.select({ count: count() }).from(customers).where(whereClause),
    db.select({ count: count() }).from(customers).where(
      and(
        ...(conditions.length > 0 ? conditions : []),
        sql`${customers.leadStatus} IN ('NEW', 'CONTACTED', 'FOLLOW_UP', 'INTERESTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION')`
      )
    ),
    db.select({ count: count() }).from(customers).where(
      and(...(conditions.length > 0 ? conditions : []), eq(customers.leadStatus, "CONVERTED"))
    ),
    db.select({ count: count() }).from(customers).where(
      and(...(conditions.length > 0 ? conditions : []), eq(customers.leadStatus, "NEW"))
    ),
    db.select({ count: count() }).from(customers).where(
      and(...(conditions.length > 0 ? conditions : []), eq(customers.leadStatus, "CONTACTED"))
    ),
    db.select({ count: count() }).from(customers).where(
      and(...(conditions.length > 0 ? conditions : []), eq(customers.leadStatus, "FOLLOW_UP"))
    ),
    db.select({ count: count() }).from(customers).where(
      and(...(conditions.length > 0 ? conditions : []), eq(customers.leadStatus, "INTERESTED"))
    ),
    db.select({ count: count() }).from(customers).where(
      and(...(conditions.length > 0 ? conditions : []), eq(customers.leadStatus, "QUALIFIED"))
    ),
    db.select({ count: count() }).from(customers).where(
      and(...(conditions.length > 0 ? conditions : []), eq(customers.leadStatus, "PROPOSAL_SENT"))
    ),
    db.select({ count: count() }).from(customers).where(
      and(...(conditions.length > 0 ? conditions : []), eq(customers.leadStatus, "NEGOTIATION"))
    ),
    db.select({ count: count() }).from(customers).where(
      and(...(conditions.length > 0 ? conditions : []), eq(customers.leadStatus, "LOST"))
    ),
    db.select({ count: count() }).from(customers).where(
      and(...(conditions.length > 0 ? conditions : []), eq(customers.leadStatus, "NOT_INTERESTED"))
    ),
  ]);

  return {
    total: total[0]?.count || 0,
    active: active[0]?.count || 0,
    converted: converted[0]?.count || 0,
    byStatus: {
      NEW: newLeads[0]?.count || 0,
      CONTACTED: contacted[0]?.count || 0,
      FOLLOW_UP: followUp[0]?.count || 0,
      INTERESTED: interested[0]?.count || 0,
      QUALIFIED: qualified[0]?.count || 0,
      PROPOSAL_SENT: proposalSent[0]?.count || 0,
      NEGOTIATION: negotiation[0]?.count || 0,
      CONVERTED: converted[0]?.count || 0,
      LOST: lost[0]?.count || 0,
      NOT_INTERESTED: notInterested[0]?.count || 0,
    },
  };
}

export async function getLeadsOverTime(db: DB, userId?: string, userRole?: string, days = 30) {
  const conditions: SQL[] = [];
  if (userRole === "TEAM_MEMBER" && userId) {
    conditions.push(eq(customers.assignedTeamMemberId, userId));
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const leads = await db.select({
    createdAt: customers.createdAt,
    leadStatus: customers.leadStatus,
  })
    .from(customers)
    .where(
      and(
        ...(conditions.length > 0 ? conditions : []),
        sql`${customers.createdAt} >= ${Math.floor(startDate.getTime() / 1000)}`
      )
    )
    .orderBy(asc(customers.createdAt));

  const grouped: Record<string, { date: string; count: number; converted: number }> = {};
  for (const lead of leads) {
    const dateKey = lead.createdAt.toISOString().split("T")[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = { date: dateKey, count: 0, converted: 0 };
    }
    grouped[dateKey].count++;
    if (lead.leadStatus === "CONVERTED") {
      grouped[dateKey].converted++;
    }
  }

  return Object.values(grouped);
}
