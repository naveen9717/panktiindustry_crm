import { NextRequest, NextResponse } from "next/server";
import { desc, eq, and, or, count, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { activityLogs } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * Activity feed for the signed-in user.
 * - MASTER_ADMIN sees all activity
 * - TEAM_MEMBER sees their own activity + activity on customers assigned to them
 *
 * Query params: page (default 1), pageSize (default 15, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "15", 10) || 15)
    );

    const where =
      user.role === "MASTER_ADMIN"
        ? undefined
        : or(
            eq(activityLogs.userId, user.id),
            and(
              eq(activityLogs.entityType, "Customer"),
              sql`exists (
                select 1 from customers c
                where c.id = activity_logs.entity_id
                  and c.assigned_team_member_id = ${user.id}
              )`
            )
          );

    const [logs, totalRow] = await Promise.all([
      db.query.activityLogs.findMany({
        where,
        orderBy: desc(activityLogs.createdAt),
        limit: pageSize,
        offset: (page - 1) * pageSize,
        with: {
          user: { columns: { firstName: true, lastName: true } },
        },
      }),
      db.select({ count: count() }).from(activityLogs).where(where),
    ]);

    const total = totalRow[0]?.count ?? 0;
    const dayAgoSeconds = Math.floor(Date.now() / 1000) - 24 * 3600;
    const unread = logs.filter(
      (l) => Math.floor(l.createdAt.getTime() / 1000) >= dayAgoSeconds
    ).length;

    return NextResponse.json({
      notifications: logs.map((l) => ({
        id: l.id,
        action: l.action,
        description: l.description,
        entityType: l.entityType,
        createdAt: l.createdAt.toISOString(),
        actor: l.user ? `${l.user.firstName} ${l.user.lastName}` : "System",
      })),
      unread,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}
