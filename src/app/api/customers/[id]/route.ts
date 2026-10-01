import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { updateCustomer, deleteCustomer, updateCustomerRemarks, updateCustomerStatus, assignCustomer, getCustomerById } from "@/lib/services/customer";
import { updateCustomerSchema, updateCustomerRemarksSchema, updateCustomerStatusSchema, assignCustomerSchema } from "@/lib/validations/customer";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const db = createDb(request.cookies.get("DB") as unknown as D1Database);
    const user = await getCurrentUser(db);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const customer = await getCustomerById(db, id, user.id, user.role);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Get customer error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const db = createDb(request.cookies.get("DB") as unknown as D1Database);
    const user = await getCurrentUser(db);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Check if it's a remarks update
    if (body.remarks !== undefined && Object.keys(body).length === 1) {
      const validated = updateCustomerRemarksSchema.safeParse({ id, remarks: body.remarks });
      if (!validated.success) {
        return NextResponse.json({ error: "Validation failed", details: validated.error.flatten() }, { status: 400 });
      }
      const ip = request.headers.get("x-forwarded-for") || null;
      await updateCustomerRemarks({ db, id, remarks: validated.data.remarks, userId: user.id, ipAddress: ip });
      return NextResponse.json({ success: true });
    }

    // Check if it's a status update
    if (body.leadStatus !== undefined && Object.keys(body).length === 1) {
      const validated = updateCustomerStatusSchema.safeParse({ id, leadStatus: body.leadStatus });
      if (!validated.success) {
        return NextResponse.json({ error: "Validation failed", details: validated.error.flatten() }, { status: 400 });
      }
      const ip = request.headers.get("x-forwarded-for") || null;
      await updateCustomerStatus({ db, id, leadStatus: validated.data.leadStatus, userId: user.id, ipAddress: ip });
      return NextResponse.json({ success: true });
    }

    // Check if it's an assignment update
    if (body.assignedTeamMemberId !== undefined && Object.keys(body).length === 1) {
      const validated = assignCustomerSchema.safeParse({ id, assignedTeamMemberId: body.assignedTeamMemberId });
      if (!validated.success) {
        return NextResponse.json({ error: "Validation failed", details: validated.error.flatten() }, { status: 400 });
      }
      const ip = request.headers.get("x-forwarded-for") || null;
      await assignCustomer({ db, id, assignedTeamMemberId: validated.data.assignedTeamMemberId || null, userId: user.id, ipAddress: ip });
      return NextResponse.json({ success: true });
    }

    // Full update
    if (user.role !== "MASTER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const validated = updateCustomerSchema.safeParse({ ...body, id });
    if (!validated.success) {
      return NextResponse.json({ error: "Validation failed", details: validated.error.flatten() }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for") || null;
    await updateCustomer({
      db,
      id,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const db = createDb(request.cookies.get("DB") as unknown as D1Database);
    const user = await getCurrentUser(db);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "MASTER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const ip = request.headers.get("x-forwarded-for") || null;
    await deleteCustomer({ db, id, userId: user.id, ipAddress: ip });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
