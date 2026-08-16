export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super(`Rate limit reached. Please wait ${retryAfterSeconds} seconds and try again.`);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export type PipelineTask = "parse-jd" | "score-match" | "score-interest" | "engage" | "general";

/**
 * OpenCode Zen Free Models Pool
 */
export const ZEN_FREE_MODELS = {
  nemotronLightning: "nemotron-3.5-lightning-free",
  nemotronUltra: "nemotron-3-ultra-free",
  laguna: "laguna-s-2.1-free",
  deepseek: "deepseek-v4-flash-free",
  mimo: "mimo-v2.5-free",
  hy3: "hy3-free",
} as const;

/**
 * Task-to-Model Mapping for distributing load across different free models
 */
export const DEFAULT_TASK_MODELS: Record<PipelineTask, string> = {
  "parse-jd": ZEN_FREE_MODELS.nemotronLightning,   // Nemotron 3.5 Lightning: fast, robust structured extraction
  "score-match": ZEN_FREE_MODELS.nemotronLightning, // Nemotron 3.5 Lightning: multi-criteria weighted scoring
  "score-interest": ZEN_FREE_MODELS.nemotronUltra,  // Nemotron 3 Ultra: sentiment & subtext analysis
  "engage": ZEN_FREE_MODELS.laguna,                 // Laguna S 2.1 / MiMo: conversational roleplay
  "general": ZEN_FREE_MODELS.nemotronLightning,
};

/**
 * Ordered fallback pool for each task to ensure zero downtime when token/rate limits are hit
 */
export const TASK_FALLBACK_POOLS: Record<PipelineTask, string[]> = {
  "parse-jd": [
    ZEN_FREE_MODELS.nemotronLightning,
    ZEN_FREE_MODELS.nemotronUltra,
    ZEN_FREE_MODELS.laguna,
    ZEN_FREE_MODELS.deepseek,
    ZEN_FREE_MODELS.mimo,
    ZEN_FREE_MODELS.hy3,
  ],
  "score-match": [
    ZEN_FREE_MODELS.nemotronLightning,
    ZEN_FREE_MODELS.nemotronUltra,
    ZEN_FREE_MODELS.laguna,
    ZEN_FREE_MODELS.deepseek,
    ZEN_FREE_MODELS.mimo,
    ZEN_FREE_MODELS.hy3,
  ],
  "score-interest": [
    ZEN_FREE_MODELS.nemotronUltra,
    ZEN_FREE_MODELS.nemotronLightning,
    ZEN_FREE_MODELS.laguna,
    ZEN_FREE_MODELS.deepseek,
    ZEN_FREE_MODELS.mimo,
    ZEN_FREE_MODELS.hy3,
  ],
  "engage": [
    ZEN_FREE_MODELS.laguna,
    ZEN_FREE_MODELS.nemotronLightning,
    ZEN_FREE_MODELS.nemotronUltra,
    ZEN_FREE_MODELS.mimo,
    ZEN_FREE_MODELS.deepseek,
    ZEN_FREE_MODELS.hy3,
  ],
  "general": [
    ZEN_FREE_MODELS.nemotronLightning,
    ZEN_FREE_MODELS.nemotronUltra,
    ZEN_FREE_MODELS.laguna,
    ZEN_FREE_MODELS.deepseek,
    ZEN_FREE_MODELS.mimo,
    ZEN_FREE_MODELS.hy3,
  ],
};

function extractRetryAfter(msg: string): number {
  const secMatch =
    msg.match(/retryDelay["\s:]+(\d+(?:\.\d+)?)s/i) ??
    msg.match(/retry[^\d]*(\d+(?:\.\d+)?)\s*s/i);
  return secMatch ? Math.ceil(parseFloat(secMatch[1])) : 15;
}

function isRateOrQuotaError(e: unknown, statusCode?: number): boolean {
  if (statusCode === 429 || statusCode === 402 || statusCode === 503) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("429") ||
    msg.includes("402") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("GenerateRequestsPerMinute") ||
    msg.includes("GenerateRequestsPerDay") ||
    msg.includes("rate limit") ||
    msg.includes("Rate limit") ||
    msg.includes("quota") ||
    msg.includes("token limit") ||
    msg.includes("capacity")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
}

export function getAIConfig(): AIConfig | null {
  const apiKey =
    process.env.OPENCODE_API_KEY ||
    process.env.ZEN_API_KEY ||
    process.env.OPENAI_API_KEY;

  if (apiKey && apiKey !== "your-opencode-api-key-here" && apiKey !== "your-zen-api-key-here") {
    return {
      apiKey,
      baseUrl: process.env.OPENCODE_BASE_URL || process.env.ZEN_BASE_URL || "https://opencode.ai/zen/v1",
    };
  }

  return null;
}

function getModelForTask(task: PipelineTask): { primary: string; fallbackList: string[] } {
  let primary = DEFAULT_TASK_MODELS[task];
  if (task === "parse-jd" && process.env.OPENCODE_MODEL_PARSE_JD) primary = process.env.OPENCODE_MODEL_PARSE_JD;
  if (task === "score-match" && process.env.OPENCODE_MODEL_SCORE_MATCH) primary = process.env.OPENCODE_MODEL_SCORE_MATCH;
  if (task === "score-interest" && process.env.OPENCODE_MODEL_SCORE_INTEREST) primary = process.env.OPENCODE_MODEL_SCORE_INTEREST;
  if (task === "engage" && process.env.OPENCODE_MODEL_ENGAGE) primary = process.env.OPENCODE_MODEL_ENGAGE;

  const baseFallbacks = TASK_FALLBACK_POOLS[task] || TASK_FALLBACK_POOLS.general;
  const fallbackList = Array.from(new Set([primary, ...baseFallbacks]));

  return { primary, fallbackList };
}

async function callOpenCodeZenSingle(
  apiKey: string,
  contents: string,
  model: string,
  baseUrl: string
): Promise<string> {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const endpoint = normalizedBase.endsWith("/chat/completions")
    ? normalizedBase
    : `${normalizedBase}/chat/completions`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: contents }],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    const error = new Error(`OpenCode Zen [${model}] (${res.status}): ${errorText || res.statusText}`);
    (error as unknown as { status: number }).status = res.status;
    throw error;
  }

  const data = await res.json();
  const textContent: string = data.choices?.[0]?.message?.content ?? "";

  return textContent
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/**
 * Smart Multi-Model OpenCode Zen caller with automatic failover between free models
 */
async function callOpenCodeZenWithFallback(
  apiKey: string,
  contents: string,
  task: PipelineTask = "general",
  baseUrl = "https://opencode.ai/zen/v1"
): Promise<string> {
  const { fallbackList } = getModelForTask(task);
  let lastError: unknown = null;

  for (let modelIdx = 0; modelIdx < fallbackList.length; modelIdx++) {
    const currentModel = fallbackList[modelIdx];

    // Try up to 2 times on the current model before falling over
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callOpenCodeZenSingle(apiKey, contents, currentModel, baseUrl);
      } catch (e) {
        lastError = e;
        const statusCode = (e as { status?: number })?.status;

        if (isRateOrQuotaError(e, statusCode)) {
          console.warn(
            `[OpenCode Zen Router] Model "${currentModel}" rate limited or quota exceeded (Attempt ${attempt + 1}/2).`
          );

          // Fail over immediately to the next free model in the pool
          if (modelIdx < fallbackList.length - 1) {
            const nextModel = fallbackList[modelIdx + 1];
            console.log(`[OpenCode Zen Router] Auto-failing over to next free model: "${nextModel}"...`);
            break;
          }

          if (attempt < 1) {
            const waitSecs = extractRetryAfter(String(e));
            await sleep(Math.min(waitSecs, 10) * 1000);
          }
        } else {
          if (attempt === 0) {
            await sleep(500);
          } else if (modelIdx < fallbackList.length - 1) {
            break;
          }
        }
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export interface CallAIOptions {
  task?: PipelineTask;
}

/**
 * Main AI Caller:
 * Routes automatically to task-optimized OpenCode Zen free models with automatic multi-model failover.
 */
export async function callAI(contents: string, options?: CallAIOptions | PipelineTask): Promise<string> {
  const config = getAIConfig();
  if (!config) {
    throw new Error(
      "No OpenCode Zen API key found. Please set OPENCODE_API_KEY in .env.local or your deployment environment variables."
    );
  }

  const task: PipelineTask =
    typeof options === "string" ? options : options?.task ?? "general";

  return callOpenCodeZenWithFallback(config.apiKey, contents, task, config.baseUrl);
}
