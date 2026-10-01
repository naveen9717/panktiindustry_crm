import type { DB } from "@/db";
import { users, customers, payments } from "@/db/schema";
import { eq, and, or, like, desc, asc, sql, count, sum, type SQL } from "drizzle-orm";
import { logActivity } from "./activity";
import { hashPassword } from "@/lib/auth/password";

interface CreateTeamMemberParams {
  db: DB;
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    role: "MASTER_ADMIN" | "TEAM_MEMBER";
    status: "ACTIVE" | "INACTIVE";
  };
  userId: string;
  ipAddress?: string | null;
}

export async function createTeamMember({ db, data, userId, ipAddress }: CreateTeamMemberParams) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });
  if (existing) throw new Error("A user with this email already exists");

  const passwordHash = await hashPassword(data.password);
  const id = crypto.randomUUID();

  await db.insert(users).values({
    id,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone || null,
    passwordHash,
    role: data.role,
    status: data.status,
  });

  await logActivity({
    db,
    userId,
    action: "TEAM_MEMBER_CREATED",
    entityType: "User",
    entityId: id,
    description: `Team member "${data.firstName} ${data.lastName}" was created`,
    ipAddress,
  });

  return { id, ...data };
}

interface UpdateTeamMemberParams {
  db: DB;
  id: string;
  data: Partial<typeof users.$inferInsert>;
  userId: string;
  ipAddress?: string | null;
}

export async function updateTeamMember({ db, id, data, userId, ipAddress }: UpdateTeamMemberParams) {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (!existing) throw new Error("Team member not found");

  if (id === userId && data.role && data.role !== existing.role) {
    throw new Error("You cannot change your own role");
  }

  await db.update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id));

  await logActivity({
    db,
    userId,
    action: "TEAM_MEMBER_UPDATED",
    entityType: "User",
    entityId: id,
    description: `Team member "${existing.firstName} ${existing.lastName}" was updated`,
    ipAddress,
  });
}

interface DeleteTeamMemberParams {
  db: DB;
  id: string;
  action: "deactivate" | "delete";
  reassignToId?: string | null;
  userId: string;
  ipAddress?: string | null;
}

export async function deleteTeamMember({ db, id, action, reassignToId, userId, ipAddress }: DeleteTeamMemberParams) {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (!existing) throw new Error("Team member not found");

  if (id === userId) {
    throw new Error("You cannot delete your own account");
  }

  if (action === "deactivate") {
    await db.update(users)
      .set({ status: "INACTIVE", updatedAt: new Date() })
      .where(eq(users.id, id));

    await logActivity({
      db,
      userId,
      action: "TEAM_MEMBER_DEACTIVATED",
      entityType: "User",
      entityId: id,
      description: `Team member "${existing.firstName} ${existing.lastName}" was deactivated`,
      ipAddress,
    });
    return;
  }

  // Hard delete - reassign customers if specified
  if (reassignToId) {
    await db.update(customers)
      .set({ assignedTeamMemberId: reassignToId })
      .where(eq(customers.assignedTeamMemberId, id));
  } else {
    await db.update(customers)
      .set({ assignedTeamMemberId: null })
      .where(eq(customers.assignedTeamMemberId, id));
  }

  await db.delete(users).where(eq(users.id, id));

  await logActivity({
    db,
    userId,
    action: "TEAM_MEMBER_DELETED",
    entityType: "User",
    entityId: id,
    description: `Team member "${existing.firstName} ${existing.lastName}" was deleted`,
    ipAddress,
  });
}

interface GetTeamMembersParams {
  db: DB;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function getTeamMembers({
  db,
  page = 1,
  pageSize = 25,
  search,
  status,
  sortBy = "createdAt",
  sortOrder = "desc",
}: GetTeamMembersParams) {
  const conditions: SQL[] = [eq(users.role, "TEAM_MEMBER")];

  if (search) {
    conditions.push(or(
        like(users.firstName, `%${search}%`),
        like(users.lastName, `%${search}%`),
        like(users.email, `%${search}%`),
        like(users.phone, `%${search}%`)
      )!);
  }

  if (status) conditions.push(eq(users.status, status as typeof users.$inferSelect.status));

  const whereClause = and(...conditions);
  const offset = (page - 1) * pageSize;

  const [members, totalResult] = await Promise.all([
    db.query.users.findMany({
      where: whereClause,
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        profileImage: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: sortOrder === "desc" ? desc(users.createdAt) : asc(users.createdAt),
      limit: pageSize,
      offset,
    }),
    db.select({ count: count() }).from(users).where(whereClause),
  ]);

  const total = totalResult[0]?.count || 0;

  // Get stats for each member
  const membersWithStats = await Promise.all(
    members.map(async (member) => {
      const [activeLeads, convertedLeads, paymentsReceived, assignedCustomers] = await Promise.all([
        db.select({ count: count() }).from(customers).where(
          and(
            eq(customers.assignedTeamMemberId, member.id),
            sql`${customers.leadStatus} IN ('NEW', 'CONTACTED', 'FOLLOW_UP', 'INTERESTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION')`
          )
        ),
        db.select({ count: count() }).from(customers).where(
          and(
            eq(customers.assignedTeamMemberId, member.id),
            eq(customers.leadStatus, "CONVERTED")
          )
        ),
        db.select({ total: sum(payments.amount) }).from(payments).where(
          and(
            eq(payments.teamMemberId, member.id),
            eq(payments.paymentStatus, "PAID")
          )
        ),
        db.select({ count: count() }).from(customers).where(
          eq(customers.assignedTeamMemberId, member.id)
        ),
      ]);

      return {
        ...member,
        _count: { assignedCustomers: assignedCustomers[0]?.count || 0 },
        activeLeads: activeLeads[0]?.count || 0,
        convertedLeads: convertedLeads[0]?.count || 0,
        paymentsReceived: Number(paymentsReceived[0]?.total || 0),
      };
    })
  );

  return { members: membersWithStats, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getTeamMemberById(db: DB, id: string) {
  const member = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      profileImage: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!member) return null;

  const [activeLeads, convertedLeads, paymentsReceived, assignedCustomers] = await Promise.all([
    db.select({ count: count() }).from(customers).where(
      and(
        eq(customers.assignedTeamMemberId, id),
        sql`${customers.leadStatus} IN ('NEW', 'CONTACTED', 'FOLLOW_UP', 'INTERESTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION')`
      )
    ),
    db.select({ count: count() }).from(customers).where(
      and(
        eq(customers.assignedTeamMemberId, id),
        eq(customers.leadStatus, "CONVERTED")
      )
    ),
    db.select({ total: sum(payments.amount) }).from(payments).where(
      and(
        eq(payments.teamMemberId, id),
        eq(payments.paymentStatus, "PAID")
      )
    ),
    db.select({ count: count() }).from(customers).where(
      eq(customers.assignedTeamMemberId, id)
    ),
  ]);

  return {
    ...member,
    _count: { assignedCustomers: assignedCustomers[0]?.count || 0 },
    activeLeads: activeLeads[0]?.count || 0,
    convertedLeads: convertedLeads[0]?.count || 0,
    paymentsReceived: Number(paymentsReceived[0]?.total || 0),
  };
}

export async function getActiveTeamMembers(db: DB) {
  return db.query.users.findMany({
    where: and(
      eq(users.role, "TEAM_MEMBER"),
      eq(users.status, "ACTIVE")
    ),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: asc(users.firstName),
  });
}
