import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/services/activity";
import { updateProfileSchema } from "@/lib/validations/team-member";

export async function PUT(request: NextRequest) {
  try {
    const db = createDb(request.cookies.get("DB") as unknown as D1Database);
    const user = await getCurrentUser(db);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateProfileSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    await db.update(users)
      .set({
        firstName: validated.data.firstName,
        lastName: validated.data.lastName,
        phone: validated.data.phone || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const ip = request.headers.get("x-forwarded-for") || null;
    await logActivity({
      db,
      userId: user.id,
      action: "PROFILE_UPDATED",
      entityType: "User",
      entityId: user.id,
      description: `Profile updated for ${user.email}`,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
