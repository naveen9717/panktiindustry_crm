import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Runs on every request (excluding static assets).
 * Auth/RBAC is enforced server-side in each page/route via `getCurrentUser()`,
 * so this middleware intentionally performs no redirects — it exists so the
 * middleware bundle is emitted and can be extended later.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
