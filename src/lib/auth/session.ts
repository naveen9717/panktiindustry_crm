import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { DB } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-dev-secret-key-change-in-production"
);

const COOKIE_NAME = "crm_session";
const TOKEN_EXPIRY = "7d";

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "MASTER_ADMIN" | "TEAM_MEMBER";
  status: string;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      firstName: payload.firstName as string,
      lastName: payload.lastName as string,
      role: payload.role as "MASTER_ADMIN" | "TEAM_MEMBER",
      status: payload.status as string,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function removeSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser(db: DB) {
  const session = await getSessionUser();
  if (!session) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.id),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      profileImage: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

export async function requireUser(db: DB) {
  const user = await getCurrentUser(db);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin(db: DB) {
  const user = await requireUser(db);
  if (user.role !== "MASTER_ADMIN") {
    throw new Error("Forbidden");
  }
  return user;
}
