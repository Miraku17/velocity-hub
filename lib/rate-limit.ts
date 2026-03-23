/**
 * In-memory rate limiter using a sliding window per IP.
 * Suitable for single-server deployments.
 * For distributed deployments, use Redis (e.g. Upstash).
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000

let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  const cutoff = now - windowMs
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
    if (entry.timestamps.length === 0) store.delete(key)
  }
}

/**
 * Check if a request should be rate limited.
 * @returns { limited: true, retryAfter } if blocked, { limited: false } if allowed.
 */
export function rateLimit(
  ip: string,
  route: string,
  { maxRequests, windowMs }: { maxRequests: number; windowMs: number }
): { limited: boolean; retryAfter?: number } {
  cleanup(windowMs)

  const key = `${ip}:${route}`
  const now = Date.now()
  const cutoff = now - windowMs

  const entry = store.get(key) ?? { timestamps: [] }
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0]
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000)
    return { limited: true, retryAfter }
  }

  entry.timestamps.push(now)
  store.set(key, entry)
  return { limited: false }
}
