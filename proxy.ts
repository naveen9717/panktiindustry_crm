import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-dev-secret-key-change-in-production"
);

const COOKIE_NAME = "crm_session";

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Public routes
  if (pathname === "/login" || pathname === "/forgot-password" || pathname.startsWith("/api/auth/")) {
    // If already logged in, redirect to appropriate dashboard
    if (token && (pathname === "/login" || pathname === "/forgot-password")) {
      const payload = await verifyToken(token);
      if (payload) {
        const role = payload.role as string;
        const redirectUrl = role === "MASTER_ADMIN" ? "/admin/dashboard" : "/team/dashboard";
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  const role = payload.role as string;
  const status = payload.status as string;

  if (status !== "ACTIVE") {
    const response = NextResponse.redirect(new URL("/login?error=account_inactive", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Role-based route protection
  const isAdminRoute = pathname.startsWith("/admin");
  const isTeamRoute = pathname.startsWith("/team");

  if (isAdminRoute && role !== "MASTER_ADMIN") {
    return NextResponse.redirect(new URL("/team/dashboard", request.url));
  }

  if (isTeamRoute && role !== "TEAM_MEMBER" && role !== "MASTER_ADMIN") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
