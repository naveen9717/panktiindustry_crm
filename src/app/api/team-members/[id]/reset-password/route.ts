import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { logActivity } from "@/lib/services/activity";
import { z } from "zod";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const db = await getDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "MASTER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const validated = resetPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const target = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!target || target.role !== "TEAM_MEMBER") {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    const passwordHash = await hashPassword(validated.data.newPassword);
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, id));

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    await logActivity({
      db,
      userId: user.id,
      action: "PASSWORD_RESET",
      entityType: "User",
      entityId: id,
      description: `Password was reset for ${target.email}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
