import type { DB } from "@/db";
import { customers, users, payments } from "@/db/schema";
import { eq, and, sql, count, sum, desc, inArray, type SQL } from "drizzle-orm";
import { paymentsOnAssignedCustomers } from "@/lib/services/payment";

interface DashboardStatsParams {
  db: DB;
  userId?: string;
  userRole?: string;
}

export async function getAdminDashboardStats({ db }: DashboardStatsParams) {
  const [
    totalLeads,
    totalTeamMembers,
    activeLeads,
    convertedLeads,
    receivedAmount,
    pendingStatusAmount,
    openPendingAmount,
    bookedAmount,
  ] = await Promise.all([
    db.select({ count: count() }).from(customers),
    db.select({ count: count() }).from(users).where(
      and(eq(users.role, "TEAM_MEMBER"), eq(users.status, "ACTIVE"))
    ),
    db.select({ count: count() }).from(customers).where(
      sql`${customers.leadStatus} IN ('NEW', 'CONTACTED', 'FOLLOW_UP', 'MORE_DETAILS_SEND', 'RINGING', 'PHONE_OFF', 'BUSY', 'INTERESTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION')`
    ),
    db.select({ count: count() }).from(customers).where(eq(customers.leadStatus, "CONVERTED")),
    // Money in: fully paid + the received part of partial payments
    db.select({ total: sum(payments.amount) }).from(payments).where(
      inArray(payments.paymentStatus, ["PAID", "PARTIAL"])
    ),
    // Outstanding: legacy PENDING rows carry their amount, every row carries pendingAmount
    db.select({ total: sum(payments.amount) }).from(payments).where(eq(payments.paymentStatus, "PENDING")),
    db.select({ total: sum(payments.pendingAmount) }).from(payments),
    // Booked value = received + outstanding (every team member's customers)
    db.select({ total: sum(payments.amount) }).from(payments),
  ]);

  return {
    totalLeads: totalLeads[0]?.count || 0,
    totalTeamMembers: totalTeamMembers[0]?.count || 0,
    activeLeads: activeLeads[0]?.count || 0,
    convertedLeads: convertedLeads[0]?.count || 0,
    pendingPayments:
      Number(pendingStatusAmount[0]?.total || 0) + Number(openPendingAmount[0]?.total || 0),
    paymentsReceived: Number(receivedAmount[0]?.total || 0),
    totalRevenue: Number(bookedAmount[0]?.total || 0) + Number(openPendingAmount[0]?.total || 0),
  };
}

export async function getTeamMemberDashboardStats({ db, userId }: DashboardStatsParams) {
  const whereClause = eq(customers.assignedTeamMemberId, userId!);
  // Payment visibility follows the customer assignment, not the payment's teamMemberId stamp
  const myPayments = paymentsOnAssignedCustomers(userId!);

  const [
    myLeads,
    activeLeads,
    convertedLeads,
    receivedAmount,
    pendingStatusAmount,
    openPendingAmount,
  ] = await Promise.all([
    db.select({ count: count() }).from(customers).where(whereClause),
    db.select({ count: count() }).from(customers).where(
      and(
        eq(customers.assignedTeamMemberId, userId!),
        sql`${customers.leadStatus} IN ('NEW', 'CONTACTED', 'FOLLOW_UP', 'MORE_DETAILS_SEND', 'RINGING', 'PHONE_OFF', 'BUSY', 'INTERESTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION')`
      )
    ),
    db.select({ count: count() }).from(customers).where(
      and(eq(customers.assignedTeamMemberId, userId!), eq(customers.leadStatus, "CONVERTED"))
    ),
    // Money in: fully paid + the received part of partial payments
    db.select({ total: sum(payments.amount) }).from(payments).where(
      and(myPayments, inArray(payments.paymentStatus, ["PAID", "PARTIAL"]))
    ),
    // Outstanding: legacy PENDING rows carry their amount, every row carries pendingAmount
    db.select({ total: sum(payments.amount) }).from(payments).where(
      and(myPayments, eq(payments.paymentStatus, "PENDING"))
    ),
    db.select({ total: sum(payments.pendingAmount) }).from(payments).where(myPayments),
  ]);

  return {
    myCustomers: myLeads[0]?.count || 0,
    myLeads: myLeads[0]?.count || 0,
    activeLeads: activeLeads[0]?.count || 0,
    convertedLeads: convertedLeads[0]?.count || 0,
    pendingPayments:
      Number(pendingStatusAmount[0]?.total || 0) + Number(openPendingAmount[0]?.total || 0),
    paymentsReceived: Number(receivedAmount[0]?.total || 0),
  };
}

export async function getRecentLeads(db: DB, limit = 5, userId?: string, userRole?: string) {
  const conditions: SQL[] = [];
  if (userRole === "TEAM_MEMBER" && userId) {
    conditions.push(eq(customers.assignedTeamMemberId, userId));
  }

  return db.query.customers.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      assignedTeamMember: {
        columns: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: desc(customers.updatedAt),
    limit,
  });
}

export async function getRecentPayments(db: DB, limit = 5, userId?: string, userRole?: string) {
  const conditions: SQL[] = [];
  if (userRole === "TEAM_MEMBER" && userId) {
    conditions.push(paymentsOnAssignedCustomers(userId));
  }

  return db.query.payments.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      customer: { columns: { id: true, name: true } },
      teamMember: { columns: { id: true, firstName: true, lastName: true } },
    },
    orderBy: desc(payments.createdAt),
    limit,
  });
}

export async function getTeamMemberPerformance(db: DB) {
  const members = await db.query.users.findMany({
    where: and(eq(users.role, "TEAM_MEMBER"), eq(users.status, "ACTIVE")),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  const performance = await Promise.all(
    members.map(async (member) => {
      const [totalCustomers, converted, paymentsReceived] = await Promise.all([
        db.select({ count: count() }).from(customers).where(eq(customers.assignedTeamMemberId, member.id)),
        db.select({ count: count() }).from(customers).where(
          and(eq(customers.assignedTeamMemberId, member.id), eq(customers.leadStatus, "CONVERTED"))
        ),
        db.select({ total: sum(payments.amount) }).from(payments).where(
          and(eq(payments.teamMemberId, member.id), eq(payments.paymentStatus, "PAID"))
        ),
      ]);

      return {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        totalCustomers: totalCustomers[0]?.count || 0,
        converted: converted[0]?.count || 0,
        paymentsReceived: Number(paymentsReceived[0]?.total || 0),
      };
    })
  );

  return performance;
}
