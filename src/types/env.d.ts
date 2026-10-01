/**
 * Cloudflare Workers bindings available to this Worker.
 * Merges with the global `CloudflareEnv` declared by @opennextjs/cloudflare.
 */
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    AUTH_SECRET: string;
    NEXT_PUBLIC_APP_URL?: string;
  }
}

export {};
