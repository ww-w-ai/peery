/**
 * scanner/llm-check.ts — Dual LLM caller (Gemini + DeepSeek)
 * Design Ref: §1.2 — LLM System Prompts, §1.3 — Scanner Logic
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
  summary: string;
  deep_review: string;
  category: string;
  use_cases: string[];
  when_to_use: string;
  how_to_use: string;
  platforms: string[];
  setup_complexity: "low" | "medium" | "high";
  requires: string[];
  similar_to: string[];
  extends: string[];
  depends_on: string[];
  highlights: string[];
  score: LLMScore;
}

export interface DualLLMResult {
  gemini: LLMResult | null;
  deepseek: LLMResult | null;
  errors: string[];
}

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek/deepseek-chat-v4-0324";

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

const geminiConfig = (apiKey: string): LLMCallConfig => ({
  endpoint: `${GEMINI_ENDPOINT}?key=${apiKey}`,
  headers: { "Content-Type": "application/json" },
  buildBody: (systemPrompt, userContent) => ({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userContent }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
  }),
  extractText: (data) => (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts?.[0]?.text,
  errorPrefix: "Gemini",
});

const deepseekConfig = (apiKey: string): LLMCallConfig => ({
  endpoint: OPENROUTER_ENDPOINT,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": "https://peery.ai",
    "X-Title": "Peery Security Scanner",
  },
  buildBody: (systemPrompt, userContent) => ({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  }),
  extractText: (data) => (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content,
  errorPrefix: "OpenRouter",
});

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

async function callGemini(codeContent: string, systemPrompt: string, apiKey: string): Promise<LLMResult> {
  return callLLM(geminiConfig(apiKey), systemPrompt, codeContent);
}

async function callDeepSeek(codeContent: string, systemPrompt: string, apiKey: string): Promise<LLMResult> {
  return callLLM(deepseekConfig(apiKey), systemPrompt, codeContent);
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
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    deep_review: typeof parsed.deep_review === "string" ? parsed.deep_review : "",
    category: typeof parsed.category === "string" ? parsed.category : "other",
    use_cases: Array.isArray(parsed.use_cases) ? parsed.use_cases.slice(0, 5) : [],
    when_to_use: typeof parsed.when_to_use === "string" ? parsed.when_to_use : "",
    how_to_use: typeof parsed.how_to_use === "string" ? parsed.how_to_use : "",
    platforms: Array.isArray(parsed.platforms) ? parsed.platforms : [],
    setup_complexity: ["low", "medium", "high"].includes(parsed.setup_complexity)
      ? parsed.setup_complexity
      : "medium",
    requires: Array.isArray(parsed.requires) ? parsed.requires : [],
    similar_to: Array.isArray(parsed.similar_to) ? parsed.similar_to : [],
    extends: Array.isArray(parsed.extends) ? parsed.extends : [],
    depends_on: Array.isArray(parsed.depends_on) ? parsed.depends_on : [],
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
  geminiKey: string,
  openRouterKey: string
): Promise<DualLLMResult> {
  const errors: string[] = [];
  let gemini: LLMResult | null = null;
  let deepseek: LLMResult | null = null;

  const codeContent = prepareCodeContent(files);

  const [geminiResult, deepseekResult] = await Promise.allSettled([
    callGemini(codeContent, securityPrompt, geminiKey),
    callDeepSeek(codeContent, crossCheckPrompt, openRouterKey),
  ]);

  if (geminiResult.status === "fulfilled") {
    gemini = geminiResult.value;
  } else {
    errors.push(`Gemini: ${geminiResult.reason?.message || "Unknown error"}`);
  }

  if (deepseekResult.status === "fulfilled") {
    deepseek = deepseekResult.value;
  } else {
    errors.push(`DeepSeek: ${deepseekResult.reason?.message || "Unknown error"}`);
  }

  return { gemini, deepseek, errors };
}
