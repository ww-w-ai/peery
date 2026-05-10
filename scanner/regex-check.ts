/**
 * scanner/regex-check.ts — Pattern matching against danger rules
 * Design Ref: §1.1 — Regex Pattern Ruleset
 */

import patterns from "./rules/patterns.json";
import type { RepoFile } from "./fetch";

export interface PatternRule {
  id: string;
  category: string;
  pattern: string;
  severity: "critical" | "high" | "medium";
  description: string;
}

export interface PatternMatch {
  rule_id: string;
  category: string;
  severity: "critical" | "high" | "medium";
  description: string;
  file: string;
  line: number;
  match: string;
}

export interface RegexResult {
  passed: boolean;
  matches: PatternMatch[];
  critical_count: number;
  high_count: number;
  medium_count: number;
}

// Pre-compile all regex patterns once at module load
const compiledRules = (patterns as PatternRule[]).reduce<
  Array<{ rule: PatternRule; regex: RegExp }>
>((acc, rule) => {
  try {
    acc.push({ rule, regex: new RegExp(rule.pattern, "gi") });
  } catch {
    // Skip invalid regex patterns
  }
  return acc;
}, []);

/**
 * Run all regex patterns against repository files.
 * Returns pass/fail and detailed match list.
 *
 * Decision logic:
 * - Any critical match = FAIL
 * - 3+ high matches = FAIL
 * - Otherwise = PASS (with warnings)
 */
export function runRegexCheck(files: RepoFile[]): RegexResult {
  const matches: PatternMatch[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");

    for (const { rule, regex } of compiledRules) {
      for (let i = 0; i < lines.length; i++) {
        // Reset lastIndex for global regex reuse
        regex.lastIndex = 0;
        const lineMatches = lines[i].match(regex);

        if (lineMatches) {
          matches.push({
            rule_id: rule.id,
            category: rule.category,
            severity: rule.severity,
            description: rule.description,
            file: file.path,
            line: i + 1,
            match: lineMatches[0].substring(0, 100),
          });
        }
      }
    }
  }

  // Single reduce for severity counting
  const counts = matches.reduce(
    (acc, m) => {
      acc[m.severity]++;
      return acc;
    },
    { critical: 0, high: 0, medium: 0 }
  );

  // Decision: any critical = fail, 3+ high = fail
  const passed = counts.critical === 0 && counts.high < 3;

  return { passed, matches, critical_count: counts.critical, high_count: counts.high, medium_count: counts.medium };
}
