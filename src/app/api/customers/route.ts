import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { createCustomer, getCustomers } from "@/lib/services/customer";
import { createCustomerSchema } from "@/lib/validations/customer";

/**
 * Lightweight customer list for pickers (e.g. the Add Payment dialog).
 * Role-scoped: team members only ever see customers assigned to them.
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1") || 1;
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20") || 20, 50);

    const result = await getCustomers({
      db,
      page,
      pageSize,
      search,
      userId: user.id,
      userRole: user.role,
    });

    return NextResponse.json({
      customers: result.customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error("List customers error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

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
