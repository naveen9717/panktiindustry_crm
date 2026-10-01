import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { createCustomer } from "@/lib/services/customer";
import { createCustomerSchema } from "@/lib/validations/customer";

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "MASTER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = createCustomerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    const customer = await createCustomer({
      db,
      data: {
        name: validated.data.name,
        email: validated.data.email || null,
        phone: validated.data.phone || null,
        address: validated.data.address || null,
        state: validated.data.state || null,
        city: validated.data.city || null,
        leadStatus: validated.data.leadStatus,
        source: validated.data.source || null,
        remarks: validated.data.remarks || null,
        assignedTeamMemberId: validated.data.assignedTeamMemberId || null,
      },
      userId: user.id,
      ipAddress: ip,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
