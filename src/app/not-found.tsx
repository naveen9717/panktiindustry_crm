import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <Building2 className="h-12 w-12 text-slate-400" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900">404</h1>
        <p className="mt-2 text-slate-500">Page not found</p>
        <p className="mt-1 text-sm text-slate-400">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href="/">
          <Button className="mt-6">Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
