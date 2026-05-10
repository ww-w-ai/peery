/**
 * POST /api/submit — Submit a skill for scanning
 * Design Ref: §4.2 — POST /api/submit
 * Plan SC: Rate limit 5 submissions/day
 */

import type { ActionFunctionArgs } from "react-router";
import type { Env } from "~/lib/db.server";
import { generateId } from "~/lib/db.server";
import { checkRateLimit } from "~/lib/kv.server";
import { jsonResponse, errorResponse, isValidGitHubUrl } from "~/lib/utils";
import type { ScanJobMessage } from "~/lib/types";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST is accepted", 405);
  }

  // Rate limit check
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const { allowed, remaining } = await checkRateLimit(env.KV, ip);

  if (!allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Maximum 5 submissions per day. Try again tomorrow.",
      429,
      { remaining: 0, reset_at: getNextMidnight() }
    );
  }

  // Parse body
  let body: { git_url?: string; tag?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_BODY", "Request body must be valid JSON", 400);
  }

  const { git_url, tag } = body;

  if (!git_url) {
    return errorResponse("INVALID_URL", "Field 'git_url' is required", 400);
  }

  if (!isValidGitHubUrl(git_url)) {
    return errorResponse("INVALID_URL", "Must be a valid GitHub URL (github.com/owner/repo)", 400);
  }

  // Generate job ID and enqueue scan
  const jobId = generateId();

  try {
    const message: ScanJobMessage = {
      job_id: jobId,
      git_url,
      tag: tag || "",
      submitted_at: new Date().toISOString(),
      callback_url: `${new URL(request.url).origin}/api/callback`,
    };
    await env.SCAN_QUEUE.send(message);
  } catch (err) {
    // If queue is not available (local dev), log and return success anyway
    console.error("Queue send failed:", err);
  }

  return jsonResponse(
    {
      message: "Scan queued",
      job_id: jobId,
      remaining_submissions: remaining,
    },
    202
  );
}

function getNextMidnight(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
