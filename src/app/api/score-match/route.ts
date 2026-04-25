import { NextRequest, NextResponse } from "next/server";
import { CandidateProfile, ParsedJD } from "@/lib/types";
import { callGemini, RateLimitError } from "@/lib/gemini";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}

interface ScoreMatchRequest {
  candidate: CandidateProfile;
  parsedJD: ParsedJD;
}

interface DimensionDetail {
  score: number;
  rationale: string;
}

interface LLMScoringResponse {
  skills_match: DimensionDetail;
  experience_match: DimensionDetail;
  education_match: DimensionDetail;
  location_compatibility: DimensionDetail;
  industry_alignment: DimensionDetail;
  overall_summary: string;
  key_strengths: string[];
  gaps_concerns: string[];
}

const SYSTEM_PROMPT = `You are a recruitment scoring expert. Evaluate this candidate against the job requirements on five dimensions:

1. skills_match (0-100, 40% weight) — How well the candidate's skills align with required skills
2. experience_match (0-100, 25% weight) — Years and relevance of experience
3. education_match (0-100, 15% weight) — Education level and field relevance
4. location_compatibility (0-100, 10% weight) — Location match, remote flexibility
5. industry_alignment (0-100, 10% weight) — Domain/industry experience relevance

For each dimension provide:
- "score": number 0-100
- "rationale": one-sentence explanation

Also provide:
- "overall_summary": 1 sentence overall assessment
- "key_strengths": array of 2-3 strings
- "gaps_concerns": array of 0-3 strings (empty array if none)

Return ONLY valid JSON (no markdown, no code fences) in this exact structure:
{
  "skills_match": {"score": number, "rationale": "string"},
  "experience_match": {"score": number, "rationale": "string"},
  "education_match": {"score": number, "rationale": "string"},
  "location_compatibility": {"score": number, "rationale": "string"},
  "industry_alignment": {"score": number, "rationale": "string"},
  "overall_summary": "string",
  "key_strengths": ["string"],
  "gaps_concerns": ["string"]
}`;

function buildUserPrompt(candidate: CandidateProfile, jd: ParsedJD): string {
  const mandatorySkills = jd.skills.filter(s => s.importance === "mandatory").map(s => s.name).join(", ");
  const preferredSkills = jd.skills.filter(s => s.importance === "preferred").map(s => s.name).join(", ");
  const niceSkills = jd.skills.filter(s => s.importance === "nice-to-have").map(s => s.name).join(", ");

  return `JOB REQUIREMENTS:
- Title: ${jd.title}
- Mandatory Skills: ${mandatorySkills || "None specified"}
- Preferred Skills: ${preferredSkills || "None specified"}
- Nice-to-have Skills: ${niceSkills || "None specified"}
- Minimum Experience: ${jd.experienceMin ?? "Not specified"} years
- Education: ${jd.education || "Not specified"}
- Location: ${jd.location || "Not specified"}
- Salary Range: ${jd.salaryRange || "Not specified"}
- Industry: ${jd.industry || "Not specified"}

CANDIDATE PROFILE:
- Name: ${candidate.name}
- Current Title: ${candidate.title}
- Company: ${candidate.company}
- Skills: ${candidate.skills.join(", ")}
- Experience: ${candidate.experience} years
- Education: ${candidate.education}
- Location: ${candidate.location}
- Salary Expectation: ${candidate.salaryExpectation || "Not specified"}
- Summary: ${candidate.summary}
- Availability: ${candidate.availability}

Score this candidate against the job requirements.`;
}

function computeWeightedTotal(llmResult: LLMScoringResponse): number {
  return Math.round(
    llmResult.skills_match.score * 0.40 +
    llmResult.experience_match.score * 0.25 +
    llmResult.education_match.score * 0.15 +
    llmResult.location_compatibility.score * 0.10 +
    llmResult.industry_alignment.score * 0.10
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateScoring(obj: any): obj is LLMScoringResponse {
  const dims = ["skills_match", "experience_match", "education_match", "location_compatibility", "industry_alignment"];
  for (const d of dims) {
    const dim = obj[d] as Record<string, unknown> | undefined;
    if (!dim || typeof dim.score !== "number" || typeof dim.rationale !== "string") return false;
  }
  if (typeof obj.overall_summary !== "string") return false;
  if (!Array.isArray(obj.key_strengths)) return false;
  if (!Array.isArray(obj.gaps_concerns)) return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body: ScoreMatchRequest = await req.json();
    const { candidate, parsedJD } = body;

    if (!candidate || !parsedJD) {
      return NextResponse.json({ error: "Missing candidate or parsedJD in request body." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your-gemini-api-key-here") {
      return NextResponse.json({ error: "Gemini API key not configured." }, { status: 500 });
    }

    const userPrompt = buildUserPrompt(candidate, parsedJD);
    let llmResult: LLMScoringResponse | null = null;
    let lastError = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const text = await callGemini(apiKey, `${SYSTEM_PROMPT}\n\n${userPrompt}`);
        const parsed = JSON.parse(text);

        if (!validateScoring(parsed)) {
          lastError = "LLM response missing required fields";
          continue;
        }

        llmResult = parsed as LLMScoringResponse;
        break;
      } catch (e) {
        if (e instanceof RateLimitError) {
          return NextResponse.json(
            { error: `Rate limit reached. Please wait ${e.retryAfterSeconds} seconds and try again.`, retryAfter: e.retryAfterSeconds },
            { status: 429 }
          );
        }
        lastError = e instanceof Error ? e.message : "Unknown parse error";
      }
    }

    if (!llmResult) {
      return NextResponse.json({ error: `Scoring failed after 3 attempts: ${lastError}` }, { status: 422 });
    }

    const totalScore = computeWeightedTotal(llmResult);

    return NextResponse.json({
      candidateId: candidate.id,
      scores: {
        skills: llmResult.skills_match.score,
        experience: llmResult.experience_match.score,
        education: llmResult.education_match.score,
        location: llmResult.location_compatibility.score,
        industry: llmResult.industry_alignment.score,
      },
      rationales: {
        skills: llmResult.skills_match.rationale,
        experience: llmResult.experience_match.rationale,
        education: llmResult.education_match.rationale,
        location: llmResult.location_compatibility.rationale,
        industry: llmResult.industry_alignment.rationale,
      },
      weights: { skills: 0.40, experience: 0.25, education: 0.15, location: 0.10, industry: 0.10 },
      totalScore,
      overallSummary: llmResult.overall_summary,
      strengths: llmResult.key_strengths,
      gaps: llmResult.gaps_concerns,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: `Rate limit reached. Please wait ${error.retryAfterSeconds} seconds and try again.`, retryAfter: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    console.error("Score-match error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
