import { NextRequest, NextResponse } from "next/server";
import { callGemini, RateLimitError } from "@/lib/gemini";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}

const SYSTEM_PROMPT = `You are a job description parser. Extract these fields from the JD and return ONLY valid JSON (no markdown, no code fences):
{
  "title": "string",
  "skills": [{"name": "string", "importance": "mandatory"|"preferred"|"nice-to-have"}],
  "experienceMin": number,
  "education": "string",
  "location": "string",
  "salaryRange": "string or null",
  "industry": "string"
}
If a field is not found, set it to null. For skills, classify each as mandatory, preferred, or nice-to-have based on the JD language (e.g. "required" = mandatory, "bonus" = nice-to-have). Return ONLY the JSON object, nothing else.`;

export async function POST(req: NextRequest) {
  try {
    const { jobDescription } = await req.json();

    if (!jobDescription || jobDescription.trim().length < 20) {
      return NextResponse.json(
        { error: "Job description is too short. Please provide a detailed JD." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your-gemini-api-key-here") {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Set GEMINI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    let parsed = null;
    let lastError = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const text = await callGemini(
          apiKey,
          `${SYSTEM_PROMPT}\n\nJob Description:\n${jobDescription}`
        );
        parsed = JSON.parse(text);
        break;
      } catch (e) {
        if (e instanceof RateLimitError) {
          return NextResponse.json(
            { error: `Rate limit reached. Please wait ${e.retryAfterSeconds} seconds and try again.`, retryAfter: e.retryAfterSeconds },
            { status: 429 }
          );
        }
        lastError = e instanceof Error ? e.message : "Unknown error";
      }
    }

    if (!parsed) {
      return NextResponse.json(
        { error: `Failed to parse JD after 3 attempts: ${lastError}` },
        { status: 422 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: `Rate limit reached. Please wait ${error.retryAfterSeconds} seconds and try again.`, retryAfter: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    console.error("Parse JD error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
