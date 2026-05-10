/**
 * POST /api/callback — Receive scan results from GitHub Actions
 * Design Ref: §4.2 — POST /api/callback
 * Security: Authenticated via X-Peery-Secret header
 */

import type { ActionFunctionArgs } from "react-router";
import type { Env } from "~/lib/db.server";
import { upsertSkill, insertVersion, insertScanLog } from "~/lib/db.server";
import { setCachedVerification } from "~/lib/kv.server";
import { jsonResponse, errorResponse } from "~/lib/utils";

interface CallbackPayload {
  git_url: string;
  git_sha: string;
  tag: string;
  safe: boolean;
  threats: string[];
  metadata: {
    name: string;
    type: string;
    summary: string;
    deep_review: string;
    categories: string[];
    use_cases: string[];
    when_to_use: string;
    how_to_use: string;
    install_command: string;
    example_prompts: string[];
    platforms: string[];
    compatible_models: string[];
    setup_complexity: "low" | "medium" | "high";
    requires: string[];
    highlights: string[];
    score: { usefulness: number; documentation: number; maintenance: number; uniqueness: number };
  };
  scan_logs: Array<{
    scanner: string;
    result: Record<string, unknown>;
  }>;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST is accepted", 405);
  }

  // Authenticate
  const secret = request.headers.get("X-Peery-Secret");
  if (!secret || secret !== env.PEERY_CALLBACK_SECRET) {
    return errorResponse("UNAUTHORIZED", "Invalid or missing X-Peery-Secret header", 401);
  }

  // Parse payload
  let payload: CallbackPayload;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("INVALID_BODY", "Request body must be valid JSON", 400);
  }

  const { git_url, git_sha, tag, safe, metadata, scan_logs } = payload;

  if (!git_url || !git_sha) {
    return errorResponse("MISSING_FIELDS", "git_url and git_sha are required", 400);
  }

  const status = safe ? "pass" : "fail";

  // Only list (create/update skill) if safe
  let skillId: string;
  if (safe && metadata) {
    skillId = await upsertSkill(env.DB, {
      git_url,
      name: metadata.name || "Unknown",
      summary: metadata.summary || "",
      deep_review: metadata.deep_review || "",
      category: JSON.stringify(metadata.categories || ["other"]),
      use_cases: metadata.use_cases || [],
      when_to_use: metadata.when_to_use || "",
      how_to_use: metadata.how_to_use || "",
      platforms: metadata.platforms || [],
      setup_complexity: metadata.setup_complexity || "medium",
      requires: metadata.requires || [],
      highlights: metadata.highlights || [],
      score: metadata.score || { usefulness: 5, documentation: 5, maintenance: 5, uniqueness: 5 },
      github_stars: 0, // Will be updated by separate process
    });

    // Graph edges will be populated by a separate cron job (v1.2)
  } else if (threats.length > 0) {
    // Auto-flag dangerous skills
    const flagId = `auto-${Date.now()}`;
    await env.DB.prepare(
      "INSERT OR IGNORE INTO flagged_skills (id, git_url, name, reason, threats, flagged_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      flagId,
      git_url,
      metadata?.name || "Unknown",
      threats.slice(0, 3).join("; ").slice(0, 500),
      JSON.stringify(threats.slice(0, 5)),
      new Date().toISOString().split("T")[0]
    ).run();
  }

  if (!safe) {
    // For failed scans, still need a skill_id for version tracking
    const existing = await env.DB
      .prepare("SELECT id FROM skills WHERE git_url = ?")
      .bind(git_url)
      .first<{ id: string }>();

    if (existing) {
      skillId = existing.id;
    } else {
      // Create a minimal entry for tracking (won't show in public list without passing version)
      skillId = await upsertSkill(env.DB, {
        git_url,
        name: metadata?.name || "Unknown",
        summary: metadata?.summary || "Scan failed",
        deep_review: "",
        category: "other",
        use_cases: [],
        when_to_use: "",
        how_to_use: "",
        platforms: [],
        setup_complexity: "medium",
        requires: [],
        highlights: [],
        score: { usefulness: 0, documentation: 0, maintenance: 0, uniqueness: 0 },
        github_stars: 0,
      });
    }
  }

  // Insert version (immutable safety record)
  const versionId = await insertVersion(env.DB, skillId, git_sha, tag || "", status);

  // Insert scan logs
  if (scan_logs && Array.isArray(scan_logs)) {
    for (const log of scan_logs) {
      await insertScanLog(env.DB, versionId, log.scanner, JSON.stringify(log.result));
    }
  }

  // Update KV cache
  if (safe) {
    await setCachedVerification(env.KV, git_url, {
      verified: true,
      skill_id: skillId,
      scanned_at: new Date().toISOString(),
      sha: git_sha,
      tag: tag || "",
    });
  }

  return jsonResponse({
    skill_id: skillId,
    version_id: versionId,
    status,
  });
}
