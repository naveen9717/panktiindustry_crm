import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { updateTeamMember, deleteTeamMember } from "@/lib/services/team-member";
import { updateTeamMemberSchema, deleteTeamMemberSchema } from "@/lib/validations/team-member";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
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
    const body = await request.json();
    const validated = updateTeamMemberSchema.safeParse({ ...body, id });

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for") || null;
    await updateTeamMember({
      db,
      id,
      data: {
        firstName: validated.data.firstName,
        lastName: validated.data.lastName,
        email: validated.data.email,
        phone: validated.data.phone || null,
        role: validated.data.role,
        status: validated.data.status,
      },
      userId: user.id,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update team member error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const body = await request.json();
    const validated = deleteTeamMemberSchema.safeParse({ ...body, id });

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for") || null;
    await deleteTeamMember({
      db,
      id,
      action: validated.data.action,
      reassignToId: validated.data.reassignToId || null,
      userId: user.id,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete team member error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
