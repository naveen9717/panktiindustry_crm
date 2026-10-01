"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [csvContent, setCsvContent] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    imported: number;
    duplicates: number;
    errors: { row: number; errors: string[] }[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(event.target?.result as string);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!csvContent) {
      toast.error("Please select a CSV file");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent, skipDuplicates: true }),
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
    setResult(null);
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
            <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">
                {file ? file.name : "Click to select a CSV file"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                CSV should have columns: name, email, phone, address, state, city, leadStatus, remarks, assignedTeamMember
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
                style={{ position: "relative" }}
              />
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-700">Expected CSV format:</p>
              <pre className="mt-2 text-xs text-slate-600">
{`name,email,phone,address,state,city,leadStatus,remarks,assignedTeamMember
John Doe,john@example.com,9876543210,123 Main St,Mumbai,Maharashtra,NEW,Interested in services,Mike`}
              </pre>
            </div>
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
            <Button onClick={handleImport} loading={loading} disabled={!csvContent}>
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
