import { NextRequest, NextResponse } from "next/server";
import { removeSessionCookie, getSessionUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/services/activity";
import { getDb } from "@/lib/db/local";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (session) {
      const db = await getDb();
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
      await logActivity({
        db,
        userId: session.id,
        action: "USER_LOGOUT",
        entityType: "User",
        entityId: session.id,
        description: `${session.firstName} ${session.lastName} logged out`,
        ipAddress: ip,
      });
    }

    await removeSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
