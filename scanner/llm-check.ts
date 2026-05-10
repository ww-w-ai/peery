/**
 * scanner/llm-check.ts — Dual LLM caller via OpenRouter
 * Primary: DeepSeek V4-Flash | Secondary: Step-3.5-Flash
 */

import type { RepoFile } from "./fetch";

export interface LLMScore {
  usefulness: number;
  documentation: number;
  maintenance: number;
  uniqueness: number;
}

export interface LLMResult {
  safe: boolean;
  threats: string[];
  name: string;
  type: "skill" | "agent" | "plugin" | "mcp-server" | "framework";
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
  score: LLMScore;
}

export interface DualLLMResult {
  primary: LLMResult | null;
  secondary: LLMResult | null;
  errors: string[];
}

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const PRIMARY_MODEL = "deepseek/deepseek-v4-flash";
const SECONDARY_MODEL = "stepfun/step-3.5-flash";

/**
 * Prepare the code content for LLM analysis.
 * Concatenates files with path headers, truncated to fit context window.
 */
function prepareCodeContent(files: RepoFile[]): string {
  const MAX_CHARS = 60_000; // Keep well within context limits
  let content = "";

  for (const file of files) {
    const fileBlock = `\n--- FILE: ${file.path} ---\n${file.content}\n`;
    if (content.length + fileBlock.length > MAX_CHARS) break;
    content += fileBlock;
  }

  return content;
}

interface LLMCallConfig {
  endpoint: string;
  headers: Record<string, string>;
  buildBody: (systemPrompt: string, userContent: string) => unknown;
  extractText: (data: Record<string, unknown>) => string | undefined;
  errorPrefix: string;
}

function openRouterConfig(apiKey: string, model: string, label: string, supportsJsonFormat = true): LLMCallConfig {
  return {
    endpoint: OPENROUTER_ENDPOINT,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://peery.ai",
      "X-Title": "Peery Security Scanner",
    },
    buildBody: (systemPrompt, userContent) => {
      const body: Record<string, unknown> = {
        model,
        messages: [
          { role: "system", content: systemPrompt + "\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown, no code fences, no explanation." },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
      };
      if (supportsJsonFormat) {
        body.response_format = { type: "json_object" };
      }
      return body;
    },
    extractText: (data) => (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content,
    errorPrefix: label,
  };
}

/**
 * Generic LLM caller — thin wrappers (callGemini/callDeepSeek) pass config.
 */
async function callLLM(
  config: LLMCallConfig,
  systemPrompt: string,
  codeContent: string
): Promise<LLMResult> {
  const userContent = `Analyze this agent skill/plugin source code for security and extract metadata:\n\n${codeContent}`;

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify(config.buildBody(systemPrompt, userContent)),
  });

  if (!response.ok) {
    throw new Error(`${config.errorPrefix} API error (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  const text = config.extractText(data as Record<string, unknown>);

  if (!text) {
    throw new Error(`${config.errorPrefix} returned empty response`);
  }

  return parseAndValidateLLMResponse(text);
}

async function callPrimary(codeContent: string, systemPrompt: string, apiKey: string): Promise<LLMResult> {
  return callLLM(openRouterConfig(apiKey, PRIMARY_MODEL, "Primary (DeepSeek V4)"), systemPrompt, codeContent);
}

async function callSecondary(codeContent: string, systemPrompt: string, apiKey: string): Promise<LLMResult> {
  return callLLM(openRouterConfig(apiKey, SECONDARY_MODEL, "Secondary (Step 3.5)", false), systemPrompt, codeContent);
}

/**
 * Parse and validate LLM JSON response against expected schema
 */
function parseAndValidateLLMResponse(text: string): LLMResult {
  // Strip any markdown code fences if present
  const cleaned = text.replace(/^```json\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  const parsed = JSON.parse(cleaned);

  // Validate required fields with defaults for resilience
  return {
    safe: typeof parsed.safe === "boolean" ? parsed.safe : false,
    threats: Array.isArray(parsed.threats) ? parsed.threats : [],
    name: typeof parsed.name === "string" ? parsed.name : "Unknown",
    type: ["skill", "agent", "plugin", "mcp-server", "framework"].includes(parsed.type) ? parsed.type : "skill",
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    deep_review: typeof parsed.deep_review === "string" ? parsed.deep_review : "",
    categories: Array.isArray(parsed.categories) ? parsed.categories.slice(0, 3) : (typeof parsed.category === "string" ? [parsed.category] : ["other"]),
    use_cases: Array.isArray(parsed.use_cases) ? parsed.use_cases.slice(0, 5) : [],
    when_to_use: typeof parsed.when_to_use === "string" ? parsed.when_to_use : "",
    how_to_use: typeof parsed.how_to_use === "string" ? parsed.how_to_use : "",
    install_command: typeof parsed.install_command === "string" ? parsed.install_command : "",
    example_prompts: Array.isArray(parsed.example_prompts) ? parsed.example_prompts.slice(0, 3) : [],
    platforms: Array.isArray(parsed.platforms) ? parsed.platforms : [],
    compatible_models: Array.isArray(parsed.compatible_models) ? parsed.compatible_models : [],
    setup_complexity: ["low", "medium", "high"].includes(parsed.setup_complexity) ? parsed.setup_complexity : "medium",
    requires: Array.isArray(parsed.requires) ? parsed.requires : [],
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 3) : [],
    score: {
      usefulness: clampScore(parsed.score?.usefulness),
      documentation: clampScore(parsed.score?.documentation),
      maintenance: clampScore(parsed.score?.maintenance),
      uniqueness: clampScore(parsed.score?.uniqueness),
    },
  };
}

function clampScore(value: unknown): number {
  const num = Number(value);
  if (isNaN(num)) return 5;
  return Math.max(1, Math.min(10, Math.round(num)));
}

/**
 * Run dual LLM check in parallel.
 * Returns both results (or null + error if one fails).
 */
export async function runDualLLMCheck(
  files: RepoFile[],
  securityPrompt: string,
  crossCheckPrompt: string,
  openRouterKey: string
): Promise<DualLLMResult> {
  const errors: string[] = [];
  let primary: LLMResult | null = null;
  let secondary: LLMResult | null = null;

  const codeContent = prepareCodeContent(files);

  const [primaryResult, secondaryResult] = await Promise.allSettled([
    callPrimary(codeContent, securityPrompt, openRouterKey),
    callSecondary(codeContent, crossCheckPrompt, openRouterKey),
  ]);

  if (primaryResult.status === "fulfilled") {
    primary = primaryResult.value;
  } else {
    errors.push(`Primary: ${primaryResult.reason?.message || "Unknown error"}`);
  }

  if (secondaryResult.status === "fulfilled") {
    secondary = secondaryResult.value;
  } else {
    errors.push(`Secondary: ${secondaryResult.reason?.message || "Unknown error"}`);
  }

  return { primary, secondary, errors };
}
