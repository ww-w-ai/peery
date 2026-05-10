/**
 * app/lib/kv.server.ts — KV cache helper
 * Design Ref: §2.3 — KV Cache Layer
 */

export interface VerifyCacheEntry {
  verified: boolean;
  skill_id: string;
  scanned_at: string;
  sha: string;
  tag: string;
}

const VERIFY_TTL = 86400 * 30; // 30 days (immutable data, long cache)
const BADGE_TTL = 3600; // 1 hour for badge cache
const RATE_LIMIT_TTL = 86400; // 24 hours for rate limit counters

/**
 * Build cache key for verification status
 */
function verifyCacheKey(url: string, sha?: string): string {
  return sha ? `verify:${url}:${sha}` : `verify:${url}:latest`;
}

/**
 * Get cached verification status
 */
export async function getCachedVerification(
  kv: KVNamespace,
  url: string,
  sha?: string
): Promise<VerifyCacheEntry | null> {
  const key = verifyCacheKey(url, sha);
  const cached = await kv.get(key, "json");
  return cached as VerifyCacheEntry | null;
}

/**
 * Set verification cache after scan completion
 */
export async function setCachedVerification(
  kv: KVNamespace,
  url: string,
  entry: VerifyCacheEntry
): Promise<void> {
  // Cache by URL+SHA (exact version)
  const keyExact = verifyCacheKey(url, entry.sha);
  await kv.put(keyExact, JSON.stringify(entry), { expirationTtl: VERIFY_TTL });

  // Also update "latest" cache
  const keyLatest = verifyCacheKey(url);
  await kv.put(keyLatest, JSON.stringify(entry), { expirationTtl: VERIFY_TTL });
}

/**
 * Get cached badge SVG
 */
export async function getCachedBadge(
  kv: KVNamespace,
  skillId: string
): Promise<string | null> {
  return await kv.get(`badge:${skillId}`);
}

/**
 * Set cached badge SVG
 */
export async function setCachedBadge(
  kv: KVNamespace,
  skillId: string,
  svg: string
): Promise<void> {
  await kv.put(`badge:${skillId}`, svg, { expirationTtl: BADGE_TTL });
}

/**
 * Check and increment rate limit for IP
 * Returns remaining submissions allowed (0 = blocked)
 */
export async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
  maxPerDay: number = 10000
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${ip}:${new Date().toISOString().split("T")[0]}`;
  const current = await kv.get(key, "text");
  const count = current ? parseInt(current, 10) : 0;

  if (count >= maxPerDay) {
    return { allowed: false, remaining: 0 };
  }

  await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_TTL });
  return { allowed: true, remaining: maxPerDay - count - 1 };
}
