import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { createPayment } from "@/lib/services/payment";
import { addPaymentSchema } from "@/lib/validations/payment";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";

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
        transactionId: validated.data.transactionId,
        remarks: validated.data.remarks,
      },
      teamMemberId: user.id,
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
