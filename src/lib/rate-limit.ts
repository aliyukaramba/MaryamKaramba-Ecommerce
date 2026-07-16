/**
 * Simple rate limiter for public endpoints (inquiry submission, newsletter signup).
 * Uses Upstash Redis when configured (recommended for Vercel's serverless/multi-instance
 * environment). Falls back to an in-memory map for local development — note the
 * in-memory fallback is NOT safe across multiple serverless instances in production.
 */

type Bucket = { count: number; resetAt: number };

const memoryStore = new Map<string, Bucket>();

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

async function upstashRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean; remaining: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, windowSeconds.toString(), "NX"],
    ]),
  });

  const data = await res.json();
  const count = Number(data?.[0]?.result ?? 1);

  return { success: count <= limit, remaining: Math.max(0, limit - count) };
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const bucket = memoryStore.get(key);

  if (!bucket || bucket.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { success: true, remaining: limit - 1 };
  }

  bucket.count += 1;
  return { success: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}

/**
 * Rate-limit by an arbitrary key (e.g. `inquiry:{ip}`).
 * Default: 5 requests per 60 seconds.
 */
export async function rateLimit(
  key: string,
  limit = 5,
  windowSeconds = 60
): Promise<{ success: boolean; remaining: number }> {
  if (hasUpstash) {
    try {
      return await upstashRateLimit(key, limit, windowSeconds);
    } catch (error) {
      console.error("Upstash rate limit failed, falling back to memory:", error);
    }
  }
  return memoryRateLimit(key, limit, windowSeconds);
}
