/**
 * In-memory rate limiter and request-size guard.
 *
 * Good enough for a single instance. On serverless or multi-instance hosting
 * this resets per instance, so move the counter to Upstash Redis or Supabase
 * before relying on it in production: noted rather than pretended.
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
