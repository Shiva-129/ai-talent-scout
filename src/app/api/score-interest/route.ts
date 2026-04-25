import { NextRequest, NextResponse } from "next/server";
import { CandidateProfile, ConversationMessage } from "@/lib/types";
import { callGemini, RateLimitError } from "@/lib/gemini";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}

const SYSTEM_PROMPT = `You are an expert at reading between the lines in recruitment conversations. Analyze this conversation transcript and score the candidate's genuine interest level from 0 to 100.

Consider these factors:
- Enthusiasm in responses (exclamation marks, positive language, follow-up questions)
- Specificity of answers (vague/generic = lower score, detailed/personal = higher)
- Willingness to discuss salary seriously and openly
- Mentions of other active interviews or offers (positive signal of being in-market)
- Timeline alignment (ready soon = higher, "maybe next year" = lower)
- Tone and responsiveness (short dismissive answers = lower, engaged dialogue = higher)
- Whether they asked questions about the role/company (curiosity = higher)

Return ONLY valid JSON (no markdown, no code fences):
{
  "interest_score": number (0-100),
  "interest_level": "very interested" | "interested" | "moderately interested" | "passive" | "not interested",
  "reasoning": "2-3 sentences explaining the score",
  "red_flags": ["string"] (array of 0-3 concern strings, empty array if none)
}

Score calibration:
- 85-100: Very interested — eager, asks questions, flexible on terms
- 65-84: Interested — positive but has some conditions or hesitations
- 45-64: Moderately interested — open but not actively pursuing
- 25-44: Passive — polite but clearly not motivated to move
- 0-24: Not interested — dismissive, short answers, declines further discussion`;

function formatTranscript(messages: ConversationMessage[]): string {
  return messages
    .map((m) => `${m.role === "recruiter" ? "Recruiter" : "Candidate"}: ${m.content}`)
    .join("\n\n");
}

interface InterestResult {
  interest_score: number;
  interest_level: string;
  reasoning: string;
  red_flags: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateResult(obj: any): obj is InterestResult {
  return (
    obj &&
    typeof obj.interest_score === "number" &&
    typeof obj.interest_level === "string" &&
    typeof obj.reasoning === "string" &&
    Array.isArray(obj.red_flags)
  );
}

export async function POST(req: NextRequest) {
  try {
    const { candidateId, messages, candidateProfile } = (await req.json()) as {
      candidateId: string;
      messages: ConversationMessage[];
      candidateProfile: CandidateProfile;
    };

    if (!candidateId || !messages || messages.length === 0) {
      return NextResponse.json({ error: "Missing candidateId or messages." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your-gemini-api-key-here") {
      return NextResponse.json({ error: "Gemini API key not configured." }, { status: 500 });
    }

    const transcript = formatTranscript(messages);
    const profileContext = candidateProfile
      ? `\nCandidate Profile Context:\n- Availability: ${candidateProfile.availability}\n- Salary Expectation: ${candidateProfile.salaryExpectation || "Not specified"}\n- Location: ${candidateProfile.location}\n`
      : "";

    const userPrompt = `${SYSTEM_PROMPT}\n${profileContext}\nTRANSCRIPT:\n${transcript}\n\nAnalyze the candidate's interest level now.`;

    let result: InterestResult | null = null;
    let lastError = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const text = await callGemini(apiKey, userPrompt);
        const parsed = JSON.parse(text);

        if (!validateResult(parsed)) {
          lastError = "Invalid interest score structure";
          continue;
        }

        parsed.interest_score = Math.max(0, Math.min(100, Math.round(parsed.interest_score)));
        result = parsed;
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

    if (!result) {
      return NextResponse.json(
        { error: `Interest scoring failed after 3 attempts: ${lastError}` },
        { status: 422 }
      );
    }

    return NextResponse.json({
      candidateId,
      interestScore: result.interest_score,
      interestLevel: result.interest_level,
      reasoning: result.reasoning,
      redFlags: result.red_flags,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: `Rate limit reached. Please wait ${error.retryAfterSeconds} seconds and try again.`, retryAfter: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    console.error("Score-interest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
