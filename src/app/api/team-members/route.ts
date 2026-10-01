import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { createTeamMember } from "@/lib/services/team-member";
import { createTeamMemberSchema } from "@/lib/validations/team-member";

export async function POST(request: NextRequest) {
  try {
    const db = createDb(request.cookies.get("DB") as unknown as D1Database);
    const user = await getCurrentUser(db);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "MASTER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = createTeamMemberSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for") || null;
    const member = await createTeamMember({
      db,
      data: {
        firstName: validated.data.firstName,
        lastName: validated.data.lastName,
        email: validated.data.email,
        phone: validated.data.phone,
        password: validated.data.password,
        role: validated.data.role,
        status: validated.data.status,
      },
      userId: user.id,
      ipAddress: ip,
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error("Create team member error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
