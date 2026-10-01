import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { createTeamMember } from "@/lib/services/team-member";
import { createTeamMemberSchema } from "@/lib/validations/team-member";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "MASTER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await db
      .select({
        id: users.id,
        name: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "TEAM_MEMBER"));

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        name: m.name && m.lastName ? `${m.name} ${m.lastName}`.trim() : m.name,
        email: m.email,
      })),
    });
  } catch (error) {
    console.error("List team members error:", error);
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
