import { GoogleGenAI } from "@google/genai";

export interface GeminiResult {
  text: string;
}

export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super(`Gemini API rate limit exceeded. Please retry in ${retryAfterSeconds} seconds.`);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function extractRetryAfter(errorMessage: string): number {
  const match = errorMessage.match(/retry[^\d]*(\d+(?:\.\d+)?)\s*s/i);
  return match ? Math.ceil(parseFloat(match[1])) : 60;
}

function isRateLimit(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
}

export async function callGemini(
  apiKey: string,
  contents: string,
  maxRetries = 3
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
      });

      const text = (response.text ?? "").trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      return text;
    } catch (e) {
      lastError = e;

      if (isRateLimit(e)) {
        const msg = e instanceof Error ? e.message : String(e);
        const retryAfter = extractRetryAfter(msg);
        throw new RateLimitError(retryAfter);
      }

      // For non-rate-limit errors, wait briefly before retrying
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
