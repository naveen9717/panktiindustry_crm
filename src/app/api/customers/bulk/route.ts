import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { bulkDeleteCustomers, bulkAssignCustomers } from "@/lib/services/customer";
import { bulkCustomerActionSchema } from "@/lib/validations/customer";

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = bulkCustomerActionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { action, ids, assignedTeamMemberId } = validated.data;
    const uniqueIds = [...new Set(ids)];
    const ip = request.headers.get("x-forwarded-for") || null;

    if (action === "delete") {
      const count = await bulkDeleteCustomers({
        db,
        ids: uniqueIds,
        userId: user.id,
        userRole: user.role,
        ipAddress: ip,
      });
      return NextResponse.json({ success: true, count });
    }

    if (!assignedTeamMemberId) {
      return NextResponse.json({ error: "Select a team member" }, { status: 400 });
    }

    const count = await bulkAssignCustomers({
      db,
      ids: uniqueIds,
      assignedTeamMemberId,
      userId: user.id,
      userRole: user.role,
      ipAddress: ip,
    });
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Bulk customer action error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    if (message.includes("No customers") || message.includes("Team member not found")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
