import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { createPayment } from "@/lib/services/payment";
import { addPaymentSchema } from "@/lib/validations/payment";
import { customers, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = addPaymentSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // Resolve which member's customer book this payment belongs to
    let teamMemberId = user.id;
    if (user.role === "MASTER_ADMIN") {
      if (!validated.data.teamMemberId) {
        return NextResponse.json({ error: "Select a team member" }, { status: 400 });
      }
      const member = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, validated.data.teamMemberId), eq(users.role, "TEAM_MEMBER")));
      if (member.length === 0) {
        return NextResponse.json({ error: "Team member not found" }, { status: 404 });
      }
      teamMemberId = validated.data.teamMemberId;
    } else if (validated.data.teamMemberId && validated.data.teamMemberId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Team members can only record payments against their own customers
    if (user.role === "TEAM_MEMBER") {
      const customer = await db.query.customers.findFirst({
        columns: { id: true, assignedTeamMemberId: true },
        where: eq(customers.id, validated.data.customerId),
      });
      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      if (customer.assignedTeamMemberId !== user.id) {
        return NextResponse.json(
          { error: "You can only add payments for your own customers" },
          { status: 403 }
        );
      }
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;

    const payment = await createPayment({
      db,
      data: {
        customerId: validated.data.customerId,
        amount: validated.data.amount,
        pendingAmount: validated.data.pendingAmount,
        paymentDate: validated.data.paymentDate
          ? new Date(validated.data.paymentDate)
          : undefined,
        paymentMode: validated.data.paymentMode,
        paymentStatus: validated.data.paymentStatus,
        remarks: validated.data.remarks,
      },
      teamMemberId,
      userId: user.id,
      ipAddress: ip,
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error("Create payment error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
