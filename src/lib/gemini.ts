import { GoogleGenAI } from "@google/genai";

export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super(`Rate limit reached. Please wait ${retryAfterSeconds} seconds and try again.`);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function extractRetryAfter(msg: string): number {
  // Prefer the retryDelay field value from the Gemini error body
  const secMatch = msg.match(/retryDelay["\s:]+(\d+(?:\.\d+)?)s/i)
    ?? msg.match(/retry[^\d]*(\d+(?:\.\d+)?)\s*s/i);
  return secMatch ? Math.ceil(parseFloat(secMatch[1])) : 30;
}

function is429(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  // Only match genuine HTTP 429 / RESOURCE_EXHAUSTED — not generic "quota" mentions
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("GenerateRequestsPerMinute") ||
    msg.includes("GenerateRequestsPerDay")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callGemini(
  apiKey: string,
  contents: string,
  maxRetries = 4
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
      });

      return (response.text ?? "")
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    } catch (e) {
      lastError = e;

      if (is429(e)) {
        const msg = e instanceof Error ? e.message : String(e);
        const waitSecs = extractRetryAfter(msg);

        // Auto-wait and retry if we have attempts left
        if (attempt < maxRetries - 1) {
          await sleep(waitSecs * 1000);
          continue;
        }

        // All retries exhausted — surface to caller
        throw new RateLimitError(waitSecs);
      }

      // Non-rate-limit error: short backoff then retry
      if (attempt < maxRetries - 1) {
        await sleep(600 * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
