/**
 * actions/run-scan.ts — GitHub Actions scan runner
 * Design Ref: §3.2 — Scan Runner Script
 *
 * Execution flow:
 * 1. Fetch target repo files via GitHub API
 * 2. Run regex-check
 * 3. Run dual LLM check (Gemini + DeepSeek in parallel)
 * 4. Run decision logic
 * 5. POST structured result to callback_url
 */

import { fetchRepoFiles } from "../scanner/fetch";
import { runRegexCheck } from "../scanner/regex-check";
import { runDualLLMCheck } from "../scanner/llm-check";
import { makeDecision } from "../scanner/decide";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ScanJobMessage } from "../app/lib/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const gitUrl = process.env.SCAN_GIT_URL;
  const sha = process.env.SCAN_SHA || undefined;
  const tag = process.env.SCAN_TAG || "";
  const callbackUrl = process.env.CALLBACK_URL;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const callbackSecret = process.env.PEERY_CALLBACK_SECRET;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!gitUrl || !callbackUrl || !openRouterKey || !callbackSecret) {
    console.error("Missing required environment variables");
    process.exit(1);
  }

  console.log(`[Peery Scan] Starting scan for: ${gitUrl}`);
  console.log(`[Peery Scan] SHA: ${sha || "latest"}, Tag: ${tag || "none"}`);

  // Step 1: Fetch repository files
  console.log("[Step 1] Fetching repository files...");
  const files = await fetchRepoFiles({ url: gitUrl, sha, token: githubToken });
  console.log(`[Step 1] Fetched ${files.length} files`);

  if (files.length === 0) {
    console.error("[Error] No scannable files found in repository");
    await postResult(callbackUrl, callbackSecret, {
      git_url: gitUrl,
      git_sha: sha || "unknown",
      tag,
      safe: false,
      threats: ["No scannable files found in repository"],
      metadata: null,
      scan_logs: [],
    });
    return;
  }

  // Step 2: Regex pattern check
  console.log("[Step 2] Running regex pattern check...");
  const regexResult = runRegexCheck(files);
  console.log(
    `[Step 2] Regex result: ${regexResult.passed ? "PASS" : "FAIL"} ` +
    `(critical: ${regexResult.critical_count}, high: ${regexResult.high_count}, medium: ${regexResult.medium_count})`
  );

  // Step 3: Dual LLM check
  console.log("[Step 3] Running dual LLM check (Gemini + DeepSeek)...");
  const securityPrompt = readFileSync(
    resolve(__dirname, "../scanner/prompts/security-check.md"),
    "utf-8"
  );
  const crossCheckPrompt = readFileSync(
    resolve(__dirname, "../scanner/prompts/cross-check.md"),
    "utf-8"
  );

  const llmResult = await runDualLLMCheck(
    files,
    securityPrompt,
    crossCheckPrompt,
    openRouterKey
  );

  if (llmResult.errors.length > 0) {
    console.warn(`[Step 3] LLM errors: ${llmResult.errors.join(", ")}`);
  }
  console.log(
    `[Step 3] Primary: ${llmResult.primary?.safe ? "SAFE" : "UNSAFE/NULL"}, ` +
    `Secondary: ${llmResult.secondary?.safe ? "SAFE" : "UNSAFE/NULL"}`
  );

  // Step 4: Decision
  console.log("[Step 4] Making decision...");
  const decision = makeDecision(regexResult, llmResult);
  console.log(
    `[Step 4] Decision: ${decision.status.toUpperCase()} ` +
    `(confidence: ${decision.confidence}, manual review: ${decision.needs_manual_review})`
  );

  // Step 5: POST result to callback
  console.log("[Step 5] Posting result to callback...");

  // Determine the actual SHA (if not provided, use "latest")
  const actualSha = sha || "latest";

  await postResult(callbackUrl, callbackSecret, {
    git_url: gitUrl,
    git_sha: actualSha,
    tag,
    safe: decision.status === "pass",
    threats: decision.threats,
    metadata: decision.metadata,
    scan_logs: [
      { scanner: "regex", result: { passed: regexResult.passed, matches: regexResult.matches.slice(0, 20) } },
      ...(llmResult.primary ? [{ scanner: "primary", result: { safe: llmResult.primary.safe, threats: llmResult.primary.threats } }] : []),
      ...(llmResult.secondary ? [{ scanner: "secondary", result: { safe: llmResult.secondary.safe, threats: llmResult.secondary.threats } }] : []),
    ],
  });

  console.log(`[Peery Scan] Complete. Status: ${decision.status.toUpperCase()}`);
}

async function postResult(
  callbackUrl: string,
  secret: string,
  payload: Record<string, unknown>
): Promise<void> {
  const response = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Peery-Secret": secret,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Callback] Failed (${response.status}): ${text}`);
    throw new Error(`Callback failed: ${response.status}`);
  }

  const result = await response.json();
  console.log(`[Callback] Success: skill_id=${result.skill_id}, status=${result.status}`);
}

main().catch((err) => {
  console.error("[Fatal Error]", err);
  process.exit(1);
});
