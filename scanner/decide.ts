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
 * Merge metadata from two LLM results, preferring Primary as primary.
 * Falls back to Secondary if Primary is null.
 */
function mergeMetadata(primary: LLMResult | null, secondary: LLMResult | null): LLMResult | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary;
  if (!secondary) return primary;

  // Use Primary as base, average scores
  return {
    ...primary,
    score: {
      usefulness: Math.round((primary.score.usefulness + secondary.score.usefulness) / 2),
      documentation: Math.round((primary.score.documentation + secondary.score.documentation) / 2),
      maintenance: Math.round((primary.score.maintenance + secondary.score.maintenance) / 2),
      uniqueness: Math.round((primary.score.uniqueness + secondary.score.uniqueness) / 2),
    },
    categories: [...new Set([...primary.categories, ...secondary.categories])].slice(0, 3),
    use_cases: [...new Set([...primary.use_cases, ...secondary.use_cases])].slice(0, 5),
    example_prompts: [...new Set([...primary.example_prompts, ...secondary.example_prompts])].slice(0, 3),
  };
}

/**
 * Make final scan decision based on regex results and dual LLM outputs.
 */
export function makeDecision(
  regexResult: RegexResult,
  llmResult: DualLLMResult
): ScanDecision {
  const { primary, secondary, errors } = llmResult;
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
      metadata: mergeMetadata(primary, secondary),
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
      metadata: mergeMetadata(primary, secondary),
      confidence: "high",
      needs_manual_review: false,
    };
  }

  // Rule 3: Both LLMs failed to respond — cannot determine
  if (!primary && !secondary) {
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
  if (!primary || !secondary) {
    const available = primary || secondary!;
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
  const primarySafe = primary.safe;
  const secondarySafe = secondary.safe;

  // Both PASS → listed
  if (primarySafe && secondarySafe) {
    return {
      status: "pass",
      reason: "Both LLMs confirm safe",
      threats: [],
      metadata: mergeMetadata(primary, secondary),
      confidence: "high",
      needs_manual_review: false,
    };
  }

  // Both FAIL → not listed
  if (!primarySafe && !secondarySafe) {
    allThreats.push(...primary.threats.map((t) => `[Primary] ${t}`));
    allThreats.push(...secondary.threats.map((t) => `[Secondary] ${t}`));
    return {
      status: "fail",
      reason: "Both LLMs detected threats",
      threats: allThreats,
      metadata: mergeMetadata(primary, secondary),
      confidence: "high",
      needs_manual_review: false,
    };
  }

  // Disagreement → conservative (not listed) + flag for manual review
  const unsafeLLM = !primarySafe ? primary : secondary;
  allThreats.push(...unsafeLLM.threats.map((t) => `[Disagreement] ${t}`));

  return {
    status: "fail",
    reason: "LLM disagreement — conservative: not listed (flagged for review)",
    threats: allThreats,
    metadata: mergeMetadata(primary, secondary),
    confidence: "medium",
    needs_manual_review: true,
  };
}
