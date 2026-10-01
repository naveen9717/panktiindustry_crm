import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { customers } from "@/db/schema";
import { and, like, type SQL } from "drizzle-orm";
import { customersToCsv } from "@/lib/services/csv";

export async function GET(request: NextRequest) {
  try {
    const db = createDb(request.cookies.get("DB") as unknown as D1Database);
    const user = await getCurrentUser(db);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "MASTER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const leadStatus = searchParams.get("leadStatus") || "";
    const assignedTeamMemberId = searchParams.get("assignedTeamMemberId") || "";
    const state = searchParams.get("state") || "";
    const city = searchParams.get("city") || "";

    const conditions: SQL[] = [];

    if (search) {
      conditions.push(
        like(customers.name, `%${search}%`)
      );
    }
    if (leadStatus) conditions.push(eq(customers.leadStatus, leadStatus as typeof customers.$inferSelect.leadStatus));
    if (assignedTeamMemberId) conditions.push(eq(customers.assignedTeamMemberId, assignedTeamMemberId));
    if (state) conditions.push(like(customers.state, `%${state}%`));
    if (city) conditions.push(like(customers.city, `%${city}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const customersList = await db.query.customers.findMany({
      where: whereClause,
      with: {
        assignedTeamMember: {
          columns: { firstName: true, lastName: true },
        },
      },
      orderBy: customers.createdAt,
    });

    const csv = customersToCsv(customersList);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "An error occurred during export" }, { status: 500 });
  }
}
