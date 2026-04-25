import { NextRequest, NextResponse } from "next/server";
import { CandidateProfile, ParsedJD } from "@/lib/types";
import { callGemini, RateLimitError } from "@/lib/gemini";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}

const SYSTEM_PROMPT = `You are simulating a phone screening conversation. Play TWO roles:
1. AI Recruiter — asks questions to assess the candidate's interest and fit.
2. Candidate — responds based on their profile data below.

The conversation must cover these topics across 8-10 messages (4-5 back-and-forth turns):
(1) Current role satisfaction at their company
(2) Motivation for change
(3) Timeline for making a move
(4) Salary expectations vs the JD range
(5) Interest in this specific role after hearing about it

IMPORTANT TONE RULES based on the candidate's availability field:
- "actively looking" → enthusiastic, asks follow-up questions, flexible, eager
- "open to opportunities" → curious, thoughtful, measured but positive
- "not looking" → polite but brief, mentions current satisfaction, sets a high bar
- "happy where I am" → dismissive, short answers, may suggest referring someone else

Return ONLY a valid JSON array (no markdown, no code fences) of message objects:
[
  {"role": "recruiter", "content": "..."},
  {"role": "candidate", "content": "..."},
  ...
]

Make the conversation feel natural and realistic. The recruiter should reference the actual job title and company details. The candidate's responses must be grounded in their real profile data (skills, experience, salary expectation, location, current company).`;

function buildUserPrompt(candidate: CandidateProfile, jd: ParsedJD): string {
  return `JOB BEING RECRUITED FOR:
- Title: ${jd.title}
- Required Skills: ${jd.skills.map(s => s.name).join(", ")}
- Min Experience: ${jd.experienceMin ?? "Not specified"} years
- Location: ${jd.location || "Not specified"}
- Salary Range: ${jd.salaryRange || "Not specified"}
- Industry: ${jd.industry || "Not specified"}

CANDIDATE PROFILE:
- Name: ${candidate.name}
- Current Title: ${candidate.title}
- Current Company: ${candidate.company}
- Skills: ${candidate.skills.join(", ")}
- Experience: ${candidate.experience} years
- Education: ${candidate.education}
- Location: ${candidate.location}
- Salary Expectation: ${candidate.salaryExpectation || "Not disclosed"}
- Availability: ${candidate.availability}
- Summary: ${candidate.summary}

Generate the full screening conversation now.`;
}

interface ConvoMessage {
  role: "recruiter" | "candidate";
  content: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateConversation(data: any): data is ConvoMessage[] {
  if (!Array.isArray(data)) return false;
  if (data.length < 4) return false;
  return data.every(
    (m: { role?: string; content?: string }) =>
      m &&
      typeof m.content === "string" &&
      (m.role === "recruiter" || m.role === "candidate")
  );
}

export async function POST(req: NextRequest) {
  try {
    const { candidate, parsedJD } = (await req.json()) as {
      candidate: CandidateProfile;
      parsedJD: ParsedJD;
    };

    if (!candidate || !parsedJD) {
      return NextResponse.json({ error: "Missing candidate or parsedJD." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your-gemini-api-key-here") {
      return NextResponse.json({ error: "Gemini API key not configured." }, { status: 500 });
    }

    const userPrompt = buildUserPrompt(candidate, parsedJD);
    let messages: ConvoMessage[] | null = null;
    let lastError = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const text = await callGemini(apiKey, `${SYSTEM_PROMPT}\n\n${userPrompt}`);
        const parsed = JSON.parse(text);

        if (!validateConversation(parsed)) {
          lastError = "Invalid conversation structure";
          continue;
        }

        messages = parsed;
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

    if (!messages) {
      return NextResponse.json(
        { error: `Engagement simulation failed after 3 attempts: ${lastError}` },
        { status: 422 }
      );
    }

    return NextResponse.json({ candidateId: candidate.id, messages });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: `Rate limit reached. Please wait ${error.retryAfterSeconds} seconds and try again.`, retryAfter: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    console.error("Engage error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
