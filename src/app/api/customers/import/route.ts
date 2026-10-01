import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/local";
import { getCurrentUser } from "@/lib/auth/session";
import { parseCsvContent, importCustomers, detectColumnMappings } from "@/lib/services/csv";

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
    const { csvContent, mappings, skipDuplicates = true, updateExisting = false } = body;

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json({ error: "CSV content is required" }, { status: 400 });
    }

    const { headers, rows } = parseCsvContent(csvContent);

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });
    }

    // Auto-detect mappings if not provided
    const columnMappings = mappings || detectColumnMappings(headers);

    const ip = request.headers.get("x-forwarded-for") || null;
    const result = await importCustomers({
      db,
      rows,
      mappings: columnMappings,
      userId: user.id,
      ipAddress: ip,
      skipDuplicates,
      updateExisting,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "An error occurred during import" }, { status: 500 });
  }
}
