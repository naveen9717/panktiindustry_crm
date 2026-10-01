import { NextResponse } from "next/server";
import { desc, eq, and, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { activityLogs } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * Recent activity for the signed-in user, used by the header notification bell.
 * - MASTER_ADMIN sees all activity
 * - TEAM_MEMBER sees their own activity + activity on customers assigned to them
 */
export async function GET() {
  try {
    const db = await getDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const logs = await db.query.activityLogs.findMany({
      where,
      orderBy: desc(activityLogs.createdAt),
      limit: 15,
      with: {
        user: { columns: { firstName: true, lastName: true } },
      },
    });

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
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}
