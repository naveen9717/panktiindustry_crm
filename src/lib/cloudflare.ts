import type { DB } from "./db";

// Cloudflare Workers environment interface
export interface CloudflareEnv {
  DB: D1Database;
  AUTH_SECRET: string;
  NEXT_PUBLIC_APP_URL: string;
}

// Get DB from Cloudflare environment
export function getDb(env: CloudflareEnv): DB {
  const { createDb } = require("./db");
  return createDb(env.DB);
}
