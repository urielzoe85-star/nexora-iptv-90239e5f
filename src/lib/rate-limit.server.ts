// Sprint 3 · Bloc A — Simple in-memory sliding-window rate limiter.
//
// Documented, intentionally minimal: protects the hottest public endpoints
// (SebPay webhook, renewal-reminders cron, emit-test) against burst abuse
// or an accidental retry storm. Runs per-Worker instance — NOT cluster-wide;
// documented as such and easy to swap for a centralised primitive later
// (Upstash / Cloudflare Durable Object / Redis).
//
// Contract:
//   allow(key, { limit, windowMs }) → { ok, remaining, resetAt }
// A caller SHOULD call allow() once per request; on `!ok` return 429 with a
// `Retry-After` header. Keys should include a stable identifier (route +
// client IP or verified caller id) so unrelated traffic doesn't share a
// bucket.

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Maximum number of hits allowed per window. */
  limit: number;
  /** Sliding window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function allow(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  // Drop hits outside the window.
  bucket.hits = bucket.hits.filter((t) => t > cutoff);
  if (bucket.hits.length >= opts.limit) {
    const oldest = bucket.hits[0];
    const resetAt = oldest + opts.windowMs;
    return {
      ok: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }
  bucket.hits.push(now);
  // Best-effort GC to keep memory bounded.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      b.hits = b.hits.filter((t) => t > cutoff);
      if (b.hits.length === 0) buckets.delete(k);
    }
  }
  return {
    ok: true,
    remaining: opts.limit - bucket.hits.length,
    resetAt: now + opts.windowMs,
    retryAfterSeconds: 0,
  };
}

/** Best-effort client key: prefer verified caller id, fall back to IP. */
export function clientKey(request: Request, prefix: string): string {
  const xff = request.headers.get("x-forwarded-for") ?? "";
  const ip = xff.split(",")[0]?.trim() || request.headers.get("cf-connecting-ip") || "unknown";
  return `${prefix}:${ip}`;
}

/** Standard 429 response with Retry-After header. */
export function tooManyRequests(result: RateLimitResult): Response {
  return new Response("Too Many Requests", {
    status: 429,
    headers: {
      "Retry-After": String(result.retryAfterSeconds),
      "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    },
  });
}