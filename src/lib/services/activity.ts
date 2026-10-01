import type { DB } from "@/db";
import { activityLogs } from "@/db/schema";

interface LogActivityParams {
  db: DB;
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string;
  ipAddress?: string | null;
}

export async function logActivity({
  db,
  userId,
  action,
  entityType,
  entityId,
  description,
  ipAddress,
}: LogActivityParams) {
  try {
    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      userId: userId || null,
      action,
      entityType,
      entityId: entityId || null,
      description: description || null,
      ipAddress: ipAddress || null,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
