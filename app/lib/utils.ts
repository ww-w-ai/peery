/**
 * app/lib/utils.ts — Shared utilities
 */

/**
 * Validate a GitHub URL format
 */
export function isValidGitHubUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return false;
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length >= 2; // At minimum: /owner/repo
  } catch {
    return false;
  }
}

/**
 * Create a JSON response with proper headers
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  return jsonResponse(
    { error: { code, message, details: details || {} } },
    status
  );
}

/**
 * Parse JSON arrays stored as text in D1
 */
export function parseJsonField<T = string[]>(field: string | null): T {
  if (!field) return [] as unknown as T;
  try {
    return JSON.parse(field);
  } catch {
    return [] as unknown as T;
  }
}

/**
 * Format a skill row for API response (parse JSON text fields)
 */
export function formatSkillForApi(row: Record<string, unknown>) {
  return {
    id: row.id,
    git_url: row.git_url,
    name: row.name,
    summary: row.summary,
    deep_review: row.deep_review,
    category: row.category,
    use_cases: parseJsonField(row.use_cases as string),
    when_to_use: row.when_to_use,
    how_to_use: row.how_to_use,
    platforms: parseJsonField(row.platforms as string),
    setup_complexity: row.setup_complexity,
    requires: parseJsonField(row.requires as string),
    highlights: parseJsonField(row.highlights as string),
    score: parseJsonField(row.score_json as string),
    github_stars: row.github_stars,
    ranking_score: row.ranking_score,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
