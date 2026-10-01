import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/local";
import { users, passwordResets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { logActivity } from "@/lib/services/activity";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const validated = resetPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { token, password } = validated.data;

    const resetRecord = await db.query.passwordResets.findFirst({
      where: eq(passwordResets.token, token),
      with: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ passwordHash })
        .where(eq(users.id, resetRecord.userId));
      await tx.update(passwordResets)
        .set({ usedAt: new Date() })
        .where(eq(passwordResets.id, resetRecord.id));
    });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    await logActivity({
      db,
      userId: resetRecord.userId,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "User",
      entityId: resetRecord.userId,
      description: `Password was reset for ${resetRecord.user.email}`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
