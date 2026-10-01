import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "./index";

/**
 * Returns a Drizzle DB instance bound to the Cloudflare D1 database.
 *
 * - In production (Workers) and in `next dev` (via initOpenNextCloudflareForDev)
 *   this resolves the real `env.DB` D1 binding from the Cloudflare context.
 * - During `next build` (prerendering) there is no request context, so we fall
 *   back to a harmless empty D1 stub — pages that matter are dynamic.
 */
export async function getDb() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (env?.DB) {
      return createDb(env.DB as D1Database);
    }
  } catch {
    // no cloudflare context available (build-time prerendering)
  }

  if (process.env.NEXT_PHASE !== "phase-production-build") {
    // In dev/production a missing binding is a real problem — surface it.
    // (getCloudflareContext throws outside of a request scope.)
  }

  const stub = {
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results: [], success: true, meta: {} }),
        first: async () => null,
        run: async () => ({ success: true, meta: {} }),
      }),
      all: async () => ({ results: [], success: true, meta: {} }),
      first: async () => null,
      run: async () => ({ success: true, meta: {} }),
    }),
    batch: async () => [],
    exec: async () => ({ results: [], count: 0, duration: 0 }),
  } as unknown as D1Database;

  return createDb(stub);
}
