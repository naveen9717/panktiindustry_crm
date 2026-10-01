import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/local";
import { users, passwordResets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/services/activity";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const validated = forgotPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const { email } = validated.data;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Generate reset token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens
    await db.update(passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(passwordResets.userId, user.id));

    await db.insert(passwordResets).values({
      id: crypto.randomUUID(),
      userId: user.id,
      token,
      expiresAt,
    });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    await logActivity({
      db,
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "User",
      entityId: user.id,
      description: `Password reset requested for ${user.email}`,
      ipAddress: ip,
    });

    // In production, send email with reset link
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
      // Only in development:
      ...(process.env.NODE_ENV !== "production" && { resetUrl, token }),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
