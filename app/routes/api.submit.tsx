/**
 * POST /api/submit — Submit a skill for scanning
 * Triggers GitHub Actions workflow_dispatch directly.
 */

import type { ActionFunctionArgs } from "react-router";
import type { Env } from "~/lib/db.server";
import { generateId } from "~/lib/db.server";
import { checkRateLimit } from "~/lib/kv.server";
import { jsonResponse, errorResponse, isValidGitHubUrl } from "~/lib/utils";

const GITHUB_REPO = "ww-w-ai/peery";
const WORKFLOW_FILE = "scan.yml";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST is accepted", 405);
  }

  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const isSeed = request.headers.get("X-Peery-Seed") === env.PEERY_CALLBACK_SECRET;

  if (!isSeed) {
    const { allowed, remaining } = await checkRateLimit(env.KV, ip);
    if (!allowed) {
      return errorResponse("RATE_LIMITED", "Maximum 5 submissions per day.", 429);
    }
  }

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

  const jobId = generateId();
  const callbackUrl = `${new URL(request.url).origin}/api/callback`;

  const dispatchResult = await triggerGitHubWorkflow(env, {
    git_url,
    sha: tag || "HEAD",
    callback_url: callbackUrl,
  });

  if (!dispatchResult.ok) {
    console.error("GitHub dispatch failed:", dispatchResult.error);
    return errorResponse("DISPATCH_FAILED", "Failed to trigger scan workflow", 502);
  }

  return jsonResponse({ message: "Scan triggered", job_id: jobId }, 202);
}

async function triggerGitHubWorkflow(
  env: Env,
  inputs: { git_url: string; sha: string; callback_url: string }
): Promise<{ ok: boolean; error?: string }> {
  const token = env.GITHUB_PAT;
  if (!token) {
    return { ok: false, error: "GITHUB_PAT not configured" };
  }

  const url = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Peery-Scanner",
    },
    body: JSON.stringify({
      ref: "main",
      inputs,
    }),
  });

  if (res.status === 204) {
    return { ok: true };
  }

  const text = await res.text();
  return { ok: false, error: `${res.status}: ${text}` };
}
