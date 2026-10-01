"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Target CRM fields understood by POST /api/customers/import. */
const CRM_FIELDS = [
  { value: "name", label: "Name (required)" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "address", label: "Address" },
  { value: "state", label: "State" },
  { value: "city", label: "City" },
  { value: "leadStatus", label: "Lead Status" },
  { value: "skip", label: "Don't import" },
];

/** Exact normalized header → CRM field. */
const EXACT_MAP: Record<string, string> = {
  name: "name", full_name: "name", fullname: "name", customer_name: "name", lead_name: "name",
  email: "email", email_address: "email", emailid: "email", email_id: "email",
  phone: "phone", phone_number: "phone", phonenumber: "phone", mobile: "phone",
  mobile_number: "phone", contact_number: "phone", whatsapp_number: "phone",
  address: "address", street_address: "address",
  state: "state", city: "city",
  status: "leadStatus", lead_status: "leadStatus", leadstatus: "leadStatus",
};

/** Fallback substring rules (checked in order). */
const CONTAINS_RULES: [RegExp, string][] = [
  [/email/, "email"],
  [/(phone|mobile|whatsapp|telephone)/, "phone"],
  [/(^|_)name$/, "name"],
  [/lead_?status/, "leadStatus"],
  [/address|street/, "address"],
];

/** Common Meta/export noise columns → skip by default. */
const NOISE_PATTERN =
  /^(created_?(time|at)|timestamp|updated_?(time|at)|is_[a-z_]+|has_[a-z_]+|page_?url|form_?id|ad_?id|campaign_?id|adset_?id|ad_?set_?id|account_?id|optimization_?goal|platform|gender|age|zip|postal_?code|country)$/;

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function detectField(header: string): string {
  const n = normalizeHeader(header);
  if (!n) return "skip";
  if (EXACT_MAP[n]) return EXACT_MAP[n];
  if (NOISE_PATTERN.test(n)) return "skip";
  for (const [pattern, field] of CONTAINS_RULES) {
    if (pattern.test(n)) return field;
  }
  return "skip";
}

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
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Extract headers + first data row for the mapping preview.
 * Handles BOM, auto-detected delimiters, and files with a title line
 * above the header row (falls back when line 1 is a single field
 * but line 2 has several).
 */
function extractCsvStructure(content: string): {
  headers: string[];
  sample: string[];
  rowCount: number;
} {
  const cleaned = content.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], sample: [], rowCount: 0 };

  let headerIndex = 0;
  let delimiter = detectDelimiter(lines[0]);
  if (
    lines.length > 2 &&
    parseCsvLine(lines[0], delimiter).length === 1 &&
    parseCsvLine(lines[1], delimiter).length > 1
  ) {
    headerIndex = 1;
    delimiter = detectDelimiter(lines[1]);
  }

  const headers = parseCsvLine(lines[headerIndex], delimiter);
  const sample =
    lines.length > headerIndex + 1 ? parseCsvLine(lines[headerIndex + 1], delimiter) : [];
  return { headers, sample, rowCount: Math.max(lines.length - headerIndex - 1, 0) };
}

interface CsvColumn {
  /** Original header text (display) */
  label: string;
  /** Lowercased/trimmed header — matches how the server keys row values */
  csvColumn: string;
  /** First data row value, for preview */
  sample: string;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [csvContent, setCsvContent] = React.useState("");
  const [columns, setColumns] = React.useState<CsvColumn[]>([]);
  const [rowCount, setRowCount] = React.useState(0);
  const [mapping, setMapping] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    imported: number;
    duplicates: number;
    errors: { row: number; errors: string[] }[];
  } | null>(null);

  const nameMapped = mapping.includes("name");

  const [teamMembers, setTeamMembers] = React.useState<{ id: string; name: string }[]>([]);
  const [assignedTo, setAssignedTo] = React.useState("");

  // Fetch team members for the "Assigned To" picker whenever the dialog opens
  React.useEffect(() => {
    if (!open) return;
    fetch("/api/team-members")
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((d) => setTeamMembers(d.members || []))
      .catch(() => setTeamMembers([]));
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || "";
      setCsvContent(content);

      // Parse header row + first data row for the mapping preview
      const { headers, sample, rowCount } = extractCsvStructure(content);
      const cols: CsvColumn[] = headers
        .map((h, i) => ({
          label: h.trim() || `Column ${i + 1}`,
          csvColumn: h.toLowerCase().trim(),
          sample: (sample[i] || "").trim(),
        }))
        .filter((c) => c.csvColumn.length > 0);

      setColumns(cols);
      setMapping(cols.map((c) => detectField(c.label)));
      setRowCount(rowCount);
    };
    reader.readAsText(selectedFile);
  };

  const setField = (index: number, field: string) => {
    setMapping((prev) => {
      const next = [...prev];
      // A CRM field may come from only one column
      if (field !== "skip") {
        next.forEach((f, i) => {
          if (i !== index && f === field) next[i] = "skip";
        });
      }
      next[index] = field;
      return next;
    });
  };

  const handleImport = async () => {
    if (!csvContent) {
      toast.error("Please select a CSV file");
      return;
    }
    if (!nameMapped) {
      toast.error("Map one column to Name before importing");
      return;
    }

    setLoading(true);
    try {
      const mappings = columns
        .map((c, i) => ({ csvColumn: c.csvColumn, crmField: mapping[i] }))
        .filter((m) => m.crmField && m.crmField !== "skip");

      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent,
          mappings,
          skipDuplicates: true,
          assignedTeamMemberId: assignedTo || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Import failed");
        return;
      }

      setResult(data);
      toast.success(`Successfully imported ${data.imported} customers`);
      router.refresh();
    } catch {
      toast.error("An error occurred during import");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setFile(null);
    setCsvContent("");
    setColumns([]);
    setMapping([]);
    setRowCount(0);
    setResult(null);
    setAssignedTo("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader>
        <DialogTitle>Import Leads from CSV</DialogTitle>
        <DialogClose onClick={handleClose} />
      </DialogHeader>
      <DialogContent className="max-w-2xl">
        {!result ? (
          <div className="space-y-4">
            {/* File picker */}
            <label className="relative block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:border-indigo-400">
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">
                {file ? file.name : "Click to select a CSV file"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {file
                  ? `${rowCount} rows · ${columns.length} columns detected`
                  : "Any CSV works — map its columns to CRM fields below"}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>

            {/* Assign imported leads to a team member */}
            <div className="flex items-center gap-3">
              <p className="w-40 shrink-0 text-sm font-semibold text-slate-900">
                Assigned To
              </p>
              <Select
                className="w-64"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Field mapping */}
            {columns.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Map CSV columns to CRM fields</p>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    CSV <ArrowRight className="h-3 w-3" /> CRM
                  </span>
                </div>

                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {columns.map((col, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{col.label}</p>
                        <p className="truncate text-xs text-slate-400">
                          {col.sample || "—"}
                        </p>
                      </div>
                      <Select
                        className="w-48 shrink-0"
                        value={mapping[i] || "skip"}
                        onChange={(e) => setField(i, e.target.value)}
                        aria-label={`Map column ${col.label}`}
                      >
                        {CRM_FIELDS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>

                {!nameMapped && (
                  <p className="mt-2 text-xs text-red-600">
                    Map one column to “Name (required)” to continue.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="font-medium text-slate-900">Import Completed</p>
                <p className="text-sm text-slate-500">
                  {result.imported} of {result.totalRows} rows imported
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-slate-900">{result.totalRows}</p>
                <p className="text-xs text-slate-500">Total Rows</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{result.validRows}</p>
                <p className="text-xs text-slate-500">Valid</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{result.invalidRows}</p>
                <p className="text-xs text-slate-500">Invalid</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{result.duplicates}</p>
                <p className="text-xs text-slate-500">Duplicates</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-medium text-red-800">Errors</p>
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto">
                  {result.errors.slice(0, 10).map((error, i) => (
                    <p key={i} className="text-xs text-red-600">
                      Row {error.row}: {error.errors.join(", ")}
                    </p>
                  ))}
                  {result.errors.length > 10 && (
                    <p className="text-xs text-red-600">...and {result.errors.length - 10} more errors</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        {!result ? (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              loading={loading}
              disabled={!csvContent || !nameMapped}
            >
              <FileText className="h-4 w-4" />
              Import
            </Button>
          </>
        ) : (
          <Button onClick={handleClose}>Done</Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
