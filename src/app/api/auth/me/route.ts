import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createDb } from "@/db";

export async function GET() {
  try {
    const db = createDb({} as D1Database);
    const user = await getCurrentUser(db);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
