import type { DB } from "@/db";
import { customers, leadImports, type Customer } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { logActivity } from "./activity";

export interface CsvRow {
  [key: string]: string;
}

export interface CsvValidationResult {
  valid: boolean;
  errors: string[];
  row: CsvRow;
}

export interface CsvImportResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  imported: number;
  duplicates: number;
  updated: number;
  failed: number;
  errors: { row: number; errors: string[] }[];
}

export interface ColumnMapping {
  csvColumn: string;
  crmField: string;
}

type LeadStatus = Customer["leadStatus"];

const VALID_LEAD_STATUSES: LeadStatus[] = [
  "NEW", "CONTACTED", "FOLLOW_UP", "INTERESTED", "QUALIFIED",
  "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST", "NOT_INTERESTED",
];

/** "In progress" → "IN_PROGRESS"; returns null when not a known status. */
function normalizeLeadStatus(value: string | null): LeadStatus | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_") as LeadStatus;
  return VALID_LEAD_STATUSES.includes(normalized) ? normalized : null;
}

// Common Meta CSV column name mappings
const COMMON_META_MAPPINGS: Record<string, string> = {
  "full_name": "name",
  "fullname": "name",
  "name": "name",
  "email": "email",
  "email_address": "email",
  "phone": "phone",
  "phone_number": "phone",
  "phonenumber": "phone",
  "mobile": "phone",
  "contact_number": "phone",
  "lead_id": "meta_lead_id",
  "meta_lead_id": "meta_lead_id",
  "id": "meta_lead_id",
  "created_time": "created_at",
  "created_at": "created_at",
  "city": "city",
  "state": "state",
  "address": "address",
  "campaign_name": "campaign_name",
  "campaign": "campaign_name",
  "adset_name": "adset_name",
  "ad_set": "adset_name",
  "ad_name": "ad_name",
  "ad": "ad_name",
  "form_name": "form_name",
  "form": "form_name",
  "source": "source",
};

const CSV_DELIMITERS = [",", ";", "\t", "|"];

/** Pick the delimiter that actually separates the most fields in a line. */
function detectDelimiter(line: string): string {
  let best = ",";
  let bestCount = 0;
  for (const d of CSV_DELIMITERS) {
    const count = line.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

export function parseCsvContent(content: string): { headers: string[]; rows: CsvRow[] } {
  const cleaned = content.replace(/^\uFEFF/, ""); // strip BOM
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  let headerIndex = 0;
  let delimiter = detectDelimiter(lines[0]);
  // Title-line fallback: line 1 is a single field but line 2 has several
  if (
    lines.length > 2 &&
    parseCsvLine(lines[0], delimiter).length === 1 &&
    parseCsvLine(lines[1], delimiter).length > 1
  ) {
    headerIndex = 1;
    delimiter = detectDelimiter(lines[1]);
  }

  const headers = parseCsvLine(lines[headerIndex], delimiter).map((h) => h.toLowerCase().trim());
  const rows: CsvRow[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], delimiter);
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseCsvLine(line: string, delimiter = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

export function detectColumnMappings(headers: string[]): ColumnMapping[] {
  return headers.map((header) => ({
    csvColumn: header,
    crmField: COMMON_META_MAPPINGS[header] || "custom",
  }));
}

export function validateCsvRows(rows: CsvRow[], mappings: ColumnMapping[]): CsvValidationResult[] {
  return rows.map((row) => {
    const errors: string[] = [];

    // Find the name field
    const nameField = mappings.find((m) => m.crmField === "name");
    if (!nameField || !row[nameField.csvColumn] || row[nameField.csvColumn].trim().length < 2) {
      errors.push("Name is required (min 2 characters)");
    }

    // Find the email field
    const emailField = mappings.find((m) => m.crmField === "email");
    if (emailField && row[emailField.csvColumn] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row[emailField.csvColumn])) {
      errors.push("Invalid email format");
    }

    // Find the phone field
    const phoneField = mappings.find((m) => m.crmField === "phone");
    if (phoneField && row[phoneField.csvColumn] && !/^\d{10,15}$/.test(row[phoneField.csvColumn].replace(/[^\d]/g, ""))) {
      errors.push("Invalid phone number");
    }

    // Sanitize CSV injection
    for (const [key, value] of Object.entries(row)) {
      if (value && /^[=+\-@]/.test(value)) {
        row[key] = `'${value}`;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      row,
    };
  });
}

interface ImportCustomersParams {
  db: DB;
  rows: CsvRow[];
  mappings: ColumnMapping[];
  userId: string;
  ipAddress?: string | null;
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  /** Team member assigned to every imported lead (chosen in the import dialog) */
  assignedTeamMemberId?: string | null;
}

export async function importCustomers({
  db,
  rows,
  mappings,
  userId,
  ipAddress,
  skipDuplicates = true,
  updateExisting = false,
  assignedTeamMemberId,
}: ImportCustomersParams): Promise<CsvImportResult> {
  const validationResults = validateCsvRows(rows, mappings);
  const validResults = validationResults.filter((r) => r.valid);
  const invalidResults = validationResults.filter((r) => !r.valid);

  let imported = 0;
  let duplicates = 0;
  let updated = 0;
  let failed = 0;
  const errors: { row: number; errors: string[] }[] = [];

  // Add validation errors
  validationResults.forEach((result, index) => {
    if (!result.valid) {
      errors.push({ row: index + 2, errors: result.errors });
    }
  });

  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < validResults.length; i += batchSize) {
    const batch = validResults.slice(i, i + batchSize);

    for (const result of batch) {
      const row = result.row;

      // Extract fields based on mapping
      const getFieldValue = (crmField: string): string | null => {
        const mapping = mappings.find((m) => m.crmField === crmField);
        return mapping ? row[mapping.csvColumn] || null : null;
      };

      const metaLeadId = getFieldValue("meta_lead_id");
      const email = getFieldValue("email");
      const phone = getFieldValue("phone");
      const name = getFieldValue("name") || "";

      // Check for duplicates
      const duplicateConditions = [];
      if (metaLeadId) duplicateConditions.push(eq(customers.metaLeadId, metaLeadId));
      if (email) duplicateConditions.push(eq(customers.email, email));
      if (phone) duplicateConditions.push(eq(customers.phone, phone));

      if (duplicateConditions.length > 0) {
        const existing = await db.query.customers.findFirst({
          where: or(...duplicateConditions),
        });

        if (existing) {
          if (updateExisting) {
            // Update existing customer
            await db.update(customers)
              .set({
                name,
                email: email || existing.email,
                phone: phone || existing.phone,
                address: getFieldValue("address") || existing.address,
                state: getFieldValue("state") || existing.state,
                city: getFieldValue("city") || existing.city,
                leadStatus: normalizeLeadStatus(getFieldValue("leadStatus")) || existing.leadStatus,
                updatedById: userId,
                updatedAt: new Date(),
              })
              .where(eq(customers.id, existing.id));
            updated++;
          } else {
            duplicates++;
          }
          continue;
        }
      }

      // Create new customer
      try {
        const id = crypto.randomUUID();
        await db.insert(customers).values({
          id,
          metaLeadId: metaLeadId || null,
          name,
          email: email || null,
          phone: phone || null,
          address: getFieldValue("address") || null,
          state: getFieldValue("state") || null,
          city: getFieldValue("city") || null,
          leadStatus: normalizeLeadStatus(getFieldValue("leadStatus")) || "NEW",
          assignedTeamMemberId: assignedTeamMemberId || null,
          source: "Meta Ads",
          customFields: JSON.stringify(
            mappings
              .filter((m) => m.crmField === "custom")
              .reduce((acc, m) => ({ ...acc, [m.csvColumn]: row[m.csvColumn] }), {})
          ),
          createdById: userId,
          updatedById: userId,
        });
        imported++;
      } catch (error) {
        failed++;
        errors.push({ row: 0, errors: ["Database error during import"] });
      }
    }
  }

  await logActivity({
    db,
    userId,
    action: "LEADS_IMPORTED",
    entityType: "Customer",
    description: `CSV import completed. Total: ${rows.length}, Imported: ${imported}, Updated: ${updated}, Duplicates: ${duplicates}, Failed: ${failed}`,
    ipAddress,
  });

  return {
    totalRows: rows.length,
    validRows: validResults.length,
    invalidRows: invalidResults.length,
    imported,
    duplicates,
    updated,
    failed,
    errors,
  };
}

export function generateCsvContent(headers: string[], rows: string[][]): string {
  const escapeCsv = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];

  return lines.join("\n");
}

export function customersToCsv(customers: {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  state: string | null;
  city: string | null;
  leadStatus: string;
  metaLeadId: string | null;
  campaignName: string | null;
  adsetName: string | null;
  adName: string | null;
  formName: string | null;
  assignedTeamMember: { firstName: string; lastName: string } | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}[]): string {
  const headers = [
    "Name", "Email", "Phone", "Address", "State", "City",
    "Lead Status", "Meta Lead ID", "Campaign", "Ad Set", "Ad", "Form",
    "Assigned Team Member", "Remarks", "Created Date", "Updated Date",
  ];

  const rows = customers.map((c) => [
    c.name,
    c.email || "",
    c.phone || "",
    c.address || "",
    c.state || "",
    c.city || "",
    c.leadStatus,
    c.metaLeadId || "",
    c.campaignName || "",
    c.adsetName || "",
    c.adName || "",
    c.formName || "",
    c.assignedTeamMember ? `${c.assignedTeamMember.firstName} ${c.assignedTeamMember.lastName}` : "",
    c.remarks || "",
    c.createdAt.toISOString(),
    c.updatedAt.toISOString(),
  ]);

  return generateCsvContent(headers, rows);
}
