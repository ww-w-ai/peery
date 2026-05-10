/**
 * scanner/decide.ts — Consensus decision logic
 * Design Ref: §1.4 — Decision Logic
 *
 * Rules:
 * - Both LLMs PASS → listed
 * - Both LLMs FAIL → not listed
 * - Disagreement → conservative (not listed) + flag for manual review
 * - Regex critical hit → override to not listed regardless of LLM
 */

import type { RegexResult } from "./regex-check";
import type { LLMResult, DualLLMResult } from "./llm-check";

export type DecisionStatus = "pass" | "fail";

export interface ScanDecision {
  status: DecisionStatus;
  reason: string;
  threats: string[];
  metadata: LLMResult | null; // Best metadata to use for listing
  confidence: "high" | "medium" | "low";
  needs_manual_review: boolean;
}

/**
 * Merge metadata from two LLM results, preferring Gemini as primary.
 * Falls back to DeepSeek if Gemini is null.
 */
function mergeMetadata(gemini: LLMResult | null, deepseek: LLMResult | null): LLMResult | null {
  if (!gemini && !deepseek) return null;
  if (!gemini) return deepseek;
  if (!deepseek) return gemini;

  // Use Gemini as base, average scores
  return {
    ...gemini,
    score: {
      usefulness: Math.round((gemini.score.usefulness + deepseek.score.usefulness) / 2),
      documentation: Math.round((gemini.score.documentation + deepseek.score.documentation) / 2),
      maintenance: Math.round((gemini.score.maintenance + deepseek.score.maintenance) / 2),
      uniqueness: Math.round((gemini.score.uniqueness + deepseek.score.uniqueness) / 2),
    },
    // Merge unique items from both
    similar_to: [...new Set([...gemini.similar_to, ...deepseek.similar_to])],
    extends: [...new Set([...gemini.extends, ...deepseek.extends])],
    depends_on: [...new Set([...gemini.depends_on, ...deepseek.depends_on])],
  };
}

/**
 * Make final scan decision based on regex results and dual LLM outputs.
 */
export function makeDecision(
  regexResult: RegexResult,
  llmResult: DualLLMResult
): ScanDecision {
  const { gemini, deepseek, errors } = llmResult;
  const allThreats: string[] = [];

  // Rule 1: Regex critical = immediate fail (overrides LLM)
  if (regexResult.critical_count > 0) {
    const regexThreats = regexResult.matches
      .filter((m) => m.severity === "critical")
      .map((m) => `[REGEX] ${m.description} (${m.file}:${m.line})`);
    allThreats.push(...regexThreats);

    return {
      status: "fail",
      reason: `Critical pattern matches found (${regexResult.critical_count} critical)`,
      threats: allThreats,
      metadata: mergeMetadata(gemini, deepseek),
      confidence: "high",
      needs_manual_review: false,
    };
  }

  // Rule 2: Regex high threshold exceeded = fail
  if (!regexResult.passed) {
    const highThreats = regexResult.matches
      .filter((m) => m.severity === "high")
      .map((m) => `[REGEX] ${m.description} (${m.file}:${m.line})`);
    allThreats.push(...highThreats);

    return {
      status: "fail",
      reason: `Multiple high-severity pattern matches (${regexResult.high_count} high)`,
      threats: allThreats,
      metadata: mergeMetadata(gemini, deepseek),
      confidence: "high",
      needs_manual_review: false,
    };
  }

  // Rule 3: Both LLMs failed to respond — cannot determine
  if (!gemini && !deepseek) {
    return {
      status: "fail",
      reason: `Both LLM checks failed: ${errors.join("; ")}`,
      threats: [],
      metadata: null,
      confidence: "low",
      needs_manual_review: true,
    };
  }

  // Rule 4: Only one LLM responded
  if (!gemini || !deepseek) {
    const available = gemini || deepseek!;
    if (!available.safe) {
      allThreats.push(...available.threats);
      return {
        status: "fail",
        reason: "Single LLM marked unsafe (other LLM unavailable)",
        threats: allThreats,
        metadata: available,
        confidence: "medium",
        needs_manual_review: true,
      };
    }
    // Single LLM says safe — still list but flag for review
    return {
      status: "pass",
      reason: "Single LLM marked safe (other LLM unavailable — flagged for review)",
      threats: [],
      metadata: available,
      confidence: "medium",
      needs_manual_review: true,
    };
  }

  // Rule 5: Both LLMs responded — apply consensus
  const geminiSafe = gemini.safe;
  const deepseekSafe = deepseek.safe;

  // Both PASS → listed
  if (geminiSafe && deepseekSafe) {
    return {
      status: "pass",
      reason: "Both LLMs confirm safe",
      threats: [],
      metadata: mergeMetadata(gemini, deepseek),
      confidence: "high",
      needs_manual_review: false,
    };
  }

  // Both FAIL → not listed
  if (!geminiSafe && !deepseekSafe) {
    allThreats.push(...gemini.threats.map((t) => `[Gemini] ${t}`));
    allThreats.push(...deepseek.threats.map((t) => `[DeepSeek] ${t}`));
    return {
      status: "fail",
      reason: "Both LLMs detected threats",
      threats: allThreats,
      metadata: mergeMetadata(gemini, deepseek),
      confidence: "high",
      needs_manual_review: false,
    };
  }

  // Disagreement → conservative (not listed) + flag for manual review
  const unsafeLLM = !geminiSafe ? gemini : deepseek;
  allThreats.push(...unsafeLLM.threats.map((t) => `[Disagreement] ${t}`));

  return {
    status: "fail",
    reason: "LLM disagreement — conservative: not listed (flagged for review)",
    threats: allThreats,
    metadata: mergeMetadata(gemini, deepseek),
    confidence: "medium",
    needs_manual_review: true,
  };
}
