import { serviceClient } from "@/lib/supabase";

/**
 * Rate limiting and request-size guards.
 *
 * Two limiters live here, and which one a route should use depends entirely
 * on what it costs to be wrong.
 *
 * `rateLimit` counts in a Map in process memory. That was honest when this
 * app ran as one process, and it is very nearly a no-op now that it runs on
 * Netlify Functions: concurrent requests can each land on a fresh instance,
 * each with an empty Map, each convinced the caller is on their first
 * request. It is kept for the cheap cases and as the fallback when there is
 * no database to reach.
 *
 * `rateLimitShared` keeps the counter in Postgres, so one limit holds across
 * every instance at once. It costs a round trip, which is why it is not the
 * default — but for an endpoint that spends money per call it is the only
 * one that means anything.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Client IP, trusting only the first hop of x-forwarded-for. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

export function tooMany(retryAfter: number) {
  return Response.json(
    { error: "Too many requests. Slow down." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/**
 * The same contract as `rateLimit`, enforced across every serverless
 * instance instead of within one.
 *
 * Use this on anything unauthenticated that costs money per request — the
 * vision and transcript endpoints are the whole reason it exists. An
 * attacker needs no account to call those, so the limit is the only thing
 * between a public URL and an unbounded API bill.
 *
 * The decision is made inside a single upsert in `check_rate_limit`, so two
 * requests arriving together cannot both read a stale count and both
 * conclude they are under the limit.
 *
 * If the database is unreachable this degrades to the in-memory limiter
 * rather than failing the request. That is deliberate: a scanner that stops
 * working because the rate-limit table is briefly unavailable is a worse
 * outcome than a window that is temporarily only per-instance.
 */
export async function rateLimitShared(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<{ ok: boolean; retryAfter: number }> {
  const db = serviceClient();
  if (!db) return rateLimit(key, { limit, windowMs });

  try {
    const { data, error } = await db.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return rateLimit(key, { limit, windowMs });
    return { ok: Boolean(row.allowed), retryAfter: Number(row.retry_after) || 0 };
  } catch {
    return rateLimit(key, { limit, windowMs });
  }
}

/**
 * Reject oversized bodies before parsing them. Without this a single 50MB
 * base64 payload can pin the process: the scan endpoint is the obvious
 * target since it legitimately accepts an image.
 */
export async function readJsonCapped<T>(
  request: Request,
  maxBytes: number
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    return {
      ok: false,
      response: Response.json({ error: "Payload too large." }, { status: 413 }),
    };
  }

  const text = await request.text();
  /* content-length can be absent or lie, so measure what actually arrived. */
  if (new TextEncoder().encode(text).length > maxBytes) {
    return {
      ok: false,
      response: Response.json({ error: "Payload too large." }, { status: 413 }),
    };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Expected a JSON body." }, { status: 400 }),
    };
  }
}
