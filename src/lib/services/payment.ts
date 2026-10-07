import type { DB } from "@/db";
import { payments, customers } from "@/db/schema";
import { eq, and, or, like, desc, asc, sql, count, sum, inArray, type SQL } from "drizzle-orm";
import { logActivity } from "./activity";

/**
 * Payments recorded on customers assigned to this team member.
 * Team members' payment views follow their book of business (the customer's
 * assignment), not the payment's teamMemberId stamp — a reassigned customer's
 * history belongs to whoever the customer is assigned to now.
 */
export function paymentsOnAssignedCustomers(userId: string): SQL {
  return sql`EXISTS (
    SELECT 1 FROM customers
    WHERE customers.id = ${payments.customerId}
      AND customers.assigned_team_member_id = ${userId}
  )`;
}

interface CreatePaymentParams {
  db: DB;
  data: {
    customerId: string;
    amount: number;
    pendingAmount?: number;
    paymentDate?: Date;
    paymentMode: string;
    paymentStatus?: string;
    remarks?: string;
  };
  teamMemberId: string;
  userId: string;
  ipAddress?: string | null;
}

export async function createPayment({ db, data, teamMemberId, userId, ipAddress }: CreatePaymentParams) {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, data.customerId),
  });
  if (!customer) throw new Error("Customer not found");

  const pendingAmount = data.pendingAmount ?? 0;
  // Nothing left to collect → fully paid; part received → partial; nothing in → pending
  const paymentStatus =
    data.paymentStatus ??
    (pendingAmount > 0 ? (data.amount > 0 ? "PARTIAL" : "PENDING") : "PAID");

  const id = crypto.randomUUID();

  await db.insert(payments).values({
    id,
    customerId: data.customerId,
    teamMemberId,
    amount: data.amount,
    pendingAmount,
    paymentDate: data.paymentDate || new Date(),
    paymentMode: data.paymentMode as typeof payments.$inferSelect.paymentMode,
    paymentStatus: paymentStatus as typeof payments.$inferInsert.paymentStatus,
    remarks: data.remarks || null,
  });

  await logActivity({
    db,
    userId,
    action: "PAYMENT_CREATED",
    entityType: "Payment",
    entityId: id,
    description: `Payment of ₹${data.amount} received${pendingAmount > 0 ? ` (₹${pendingAmount} pending)` : ""} for customer "${customer.name}"`,
    ipAddress,
  });

  return { id, ...data };
}

interface UpdatePaymentParams {
  db: DB;
  id: string;
  data: Partial<typeof payments.$inferInsert>;
  userId: string;
  ipAddress?: string | null;
}

export async function updatePayment({ db, id, data, userId, ipAddress }: UpdatePaymentParams) {
  const existing = await db.query.payments.findFirst({
    where: eq(payments.id, id),
  });
  if (!existing) throw new Error("Payment not found");

  await db.update(payments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(payments.id, id));

  await logActivity({
    db,
    userId,
    action: "PAYMENT_UPDATED",
    entityType: "Payment",
    entityId: id,
    description: `Payment updated`,
    ipAddress,
  });
}

interface DeletePaymentParams {
  db: DB;
  id: string;
  userId: string;
  ipAddress?: string | null;
}

export async function deletePayment({ db, id, userId, ipAddress }: DeletePaymentParams) {
  const existing = await db.query.payments.findFirst({
    where: eq(payments.id, id),
  });
  if (!existing) throw new Error("Payment not found");

  await db.delete(payments).where(eq(payments.id, id));

  await logActivity({
    db,
    userId,
    action: "PAYMENT_DELETED",
    entityType: "Payment",
    entityId: id,
    description: `Payment deleted`,
    ipAddress,
  });
}

interface GetPaymentsParams {
  db: DB;
  page?: number;
  pageSize?: number;
  search?: string;
  paymentStatus?: string;
  paymentMode?: string;
  teamMemberId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  userId?: string;
  userRole?: string;
}

export async function getPayments({
  db,
  page = 1,
  pageSize = 25,
  search,
  paymentStatus,
  paymentMode,
  teamMemberId,
  customerId,
  dateFrom,
  dateTo,
  sortBy = "createdAt",
  sortOrder = "desc",
  userId,
  userRole,
}: GetPaymentsParams) {
  const conditions: SQL[] = [];

  // Role-based filtering
  if (userRole === "TEAM_MEMBER" && userId) {
    conditions.push(eq(payments.teamMemberId, userId));
  } else if (teamMemberId) {
    conditions.push(eq(payments.teamMemberId, teamMemberId));
  }

  if (search) {
    conditions.push(or(
        like(customers.name, `%${search}%`),
        like(customers.email, `%${search}%`),
        like(payments.id, `%${search}%`)
      )!);
  }

  if (paymentStatus) conditions.push(eq(payments.paymentStatus, paymentStatus as typeof payments.$inferSelect.paymentStatus));
  if (paymentMode) conditions.push(eq(payments.paymentMode, paymentMode as typeof payments.$inferSelect.paymentMode));
  if (customerId) conditions.push(eq(payments.customerId, customerId));

  if (dateFrom) {
    conditions.push(sql`${payments.paymentDate} >= ${Math.floor(new Date(dateFrom).getTime() / 1000)}`);
  }
  if (dateTo) {
    conditions.push(sql`${payments.paymentDate} <= ${Math.floor(new Date(dateTo).getTime() / 1000)}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const [paymentsList, totalResult] = await Promise.all([
    db.query.payments.findMany({
      where: whereClause,
      with: {
        customer: {
          columns: { id: true, name: true, email: true, phone: true },
        },
        teamMember: {
          columns: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: sortOrder === "desc" ? desc(payments.createdAt) : asc(payments.createdAt),
      limit: pageSize,
      offset,
    }),
    db.select({ count: count() }).from(payments).where(whereClause),
  ]);

  const total = totalResult[0]?.count || 0;

  return { payments: paymentsList, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getPaymentStats(db: DB, userId?: string, userRole?: string) {
  const conditions: SQL[] = [];
  if (userRole === "TEAM_MEMBER" && userId) {
    conditions.push(eq(payments.teamMemberId, userId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [
    totalAmount,
    receivedAmount,
    pendingStatusAmount,
    openPendingAmount,
    partialAmount,
    totalCount,
    paidCount,
    pendingCount,
    partialCount,
  ] =
    await Promise.all([
      db.select({ total: sum(payments.amount) }).from(payments).where(whereClause),
      // Money actually in: fully paid + the received part of partial payments
      db.select({ total: sum(payments.amount) }).from(payments).where(
        and(
          ...(conditions.length > 0 ? conditions : []),
          inArray(payments.paymentStatus, ["PAID", "PARTIAL"])
        )
      ),
      db.select({ total: sum(payments.amount) }).from(payments).where(
        and(...(conditions.length > 0 ? conditions : []), eq(payments.paymentStatus, "PENDING"))
      ),
      db.select({ total: sum(payments.pendingAmount) }).from(payments).where(whereClause),
      db.select({ total: sum(payments.amount) }).from(payments).where(
        and(...(conditions.length > 0 ? conditions : []), eq(payments.paymentStatus, "PARTIAL"))
      ),
      db.select({ count: count() }).from(payments).where(whereClause),
      db.select({ count: count() }).from(payments).where(
        and(...(conditions.length > 0 ? conditions : []), eq(payments.paymentStatus, "PAID"))
      ),
      db.select({ count: count() }).from(payments).where(
        and(...(conditions.length > 0 ? conditions : []), eq(payments.paymentStatus, "PENDING"))
      ),
      db.select({ count: count() }).from(payments).where(
        and(...(conditions.length > 0 ? conditions : []), eq(payments.paymentStatus, "PARTIAL"))
      ),
    ]);

  return {
    // Booked value = received amounts + amounts still outstanding
    totalAmount: Number(totalAmount[0]?.total || 0) + Number(openPendingAmount[0]?.total || 0),
    receivedAmount: Number(receivedAmount[0]?.total || 0),
    // Legacy PENDING rows carry their amount; newer rows carry pendingAmount
    pendingAmount: Number(pendingStatusAmount[0]?.total || 0) + Number(openPendingAmount[0]?.total || 0),
    partialAmount: Number(partialAmount[0]?.total || 0),
    totalCount: totalCount[0]?.count || 0,
    paidCount: paidCount[0]?.count || 0,
    pendingCount: pendingCount[0]?.count || 0,
    partialCount: partialCount[0]?.count || 0,
  };
}

export async function getPaymentsOverTime(db: DB, userId?: string, userRole?: string, days = 30) {
  const conditions: SQL[] = [];
  if (userRole === "TEAM_MEMBER" && userId) {
    conditions.push(paymentsOnAssignedCustomers(userId));
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const paymentsList = await db.select({
    paymentDate: payments.paymentDate,
    amount: payments.amount,
    paymentStatus: payments.paymentStatus,
  })
    .from(payments)
    .where(
      and(
        ...(conditions.length > 0 ? conditions : []),
        sql`${payments.paymentDate} >= ${Math.floor(startDate.getTime() / 1000)}`
      )
    )
    .orderBy(asc(payments.paymentDate));

  const grouped: Record<string, { date: string; amount: number; count: number }> = {};
  for (const payment of paymentsList) {
    const dateKey = payment.paymentDate.toISOString().split("T")[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = { date: dateKey, amount: 0, count: 0 };
    }
    grouped[dateKey].amount += payment.amount;
    grouped[dateKey].count++;
  }

  return Object.values(grouped);
}
