/**
 * GET /api/verify — Check verification status for a skill URL
 * Design Ref: §4.2 — GET /api/verify
 * Plan SC: /api/verify responds in <200ms (KV cache hit)
 */

import type { LoaderFunctionArgs } from "react-router";
import type { Env } from "~/lib/db.server";
import { getCachedVerification, setCachedVerification } from "~/lib/kv.server";
import { jsonResponse, errorResponse, isValidGitHubUrl } from "~/lib/utils";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const url = new URL(request.url);
  const gitUrl = url.searchParams.get("url");
  const sha = url.searchParams.get("sha") || undefined;

  if (!gitUrl) {
    return errorResponse("MISSING_URL", "Query parameter 'url' is required", 400);
  }

  if (!isValidGitHubUrl(gitUrl)) {
    return errorResponse("INVALID_URL", "Must be a valid GitHub URL", 400);
  }

  // Check KV cache first (fast path)
  const cached = await getCachedVerification(env.KV, gitUrl, sha);
  if (cached) {
    return jsonResponse({
      verified: cached.verified,
      version: {
        sha: cached.sha,
        tag: cached.tag || null,
        scanned_at: cached.scanned_at,
      },
      skill_id: cached.skill_id,
    });
  }

  // Fallback to D1
  const skill = await env.DB
    .prepare("SELECT id FROM skills WHERE git_url = ?")
    .bind(gitUrl)
    .first<{ id: string }>();

  if (!skill) {
    return jsonResponse({ verified: false, reason: "not_found" }, 404);
  }

  // Get latest passing version
  const version = sha
    ? await env.DB
        .prepare("SELECT * FROM versions WHERE skill_id = ? AND git_sha = ? AND status = 'pass'")
        .bind(skill.id, sha)
        .first()
    : await env.DB
        .prepare("SELECT * FROM versions WHERE skill_id = ? AND status = 'pass' ORDER BY scanned_at DESC LIMIT 1")
        .bind(skill.id)
        .first();

  if (!version) {
    return jsonResponse({ verified: false, reason: "no_passing_version" }, 404);
  }

  // Write back to KV cache so future requests are fast
  await setCachedVerification(env.KV, gitUrl, {
    verified: true,
    skill_id: skill.id,
    sha: version.git_sha as string,
    tag: (version.tag as string) || "",
    scanned_at: version.scanned_at as string,
  });

  return jsonResponse({
    verified: true,
    version: {
      sha: version.git_sha,
      tag: version.tag || null,
      scanned_at: version.scanned_at,
    },
    skill_id: skill.id,
  });
}
