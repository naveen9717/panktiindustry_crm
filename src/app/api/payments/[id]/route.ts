import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { updatePayment } from "@/lib/services/payment";
import { updatePaymentSchema } from "@/lib/validations/payment";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const db = await getDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await db.query.payments.findFirst({
      where: eq(payments.id, id),
    });
    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Team members can only edit payments on their own customer book
    if (user.role !== "MASTER_ADMIN" && existing.teamMemberId !== user.id) {
      return NextResponse.json(
        { error: "You can only edit payments for your own customers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updatePaymentSchema.safeParse({ ...body, id });
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }
    const data = validated.data;

    // Only detail fields are editable — a payment never changes customer or member
    const updates: Partial<typeof payments.$inferInsert> = {};
    if (data.amount !== undefined) updates.amount = data.amount;
    if (data.pendingAmount !== undefined) updates.pendingAmount = data.pendingAmount;
    if (data.paymentDate !== undefined) updates.paymentDate = new Date(data.paymentDate);
    if (data.paymentMode !== undefined) {
      updates.paymentMode = data.paymentMode as typeof payments.$inferInsert.paymentMode;
    }
    if (data.remarks !== undefined) updates.remarks = data.remarks || null;

    const amount = data.amount ?? existing.amount;
    const pendingAmount = data.pendingAmount ?? existing.pendingAmount;
    if (data.paymentStatus) {
      updates.paymentStatus = data.paymentStatus as typeof payments.$inferInsert.paymentStatus;
    } else if (data.amount !== undefined || data.pendingAmount !== undefined) {
      // Money split changed with no explicit status → keep it consistent
      updates.paymentStatus = (pendingAmount > 0
        ? amount > 0
          ? "PARTIAL"
          : "PENDING"
        : "PAID") as typeof payments.$inferInsert.paymentStatus;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes to update" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;

    await updatePayment({ db, id, data: updates, userId: user.id, ipAddress: ip });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update payment error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
