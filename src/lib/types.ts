export interface CandidateProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  skills: string[];
  experience: number;
  education: string;
  location: string;
  salaryExpectation: string | null;
  summary: string;
  availability: "actively looking" | "open to opportunities" | "not looking" | "happy where I am";
}

export interface SkillRequirement {
  name: string;
  importance: "mandatory" | "preferred" | "nice-to-have";
}

export interface ParsedJD {
  title: string;
  skills: SkillRequirement[];
  experienceMin: number;
  education: string;
  location: string;
  salaryRange: string | null;
  industry: string;
}

export interface MatchScore {
  candidateId: string;
  scores: {
    skills: number;
    experience: number;
    education: number;
    location: number;
    industry: number;
  };
  weights: {
    skills: number;
    experience: number;
    education: number;
    location: number;
    industry: number;
  };
  totalScore: number;
  strengths: string[];
  gaps: string[];
}

export interface InterestScore {
  candidateId: string;
  interestScore: number;
  interestLevel: string;
  reasoning: string;
  redFlags: string[];
}

export interface ConversationMessage {
  role: "recruiter" | "candidate";
  content: string;
}

export interface PipelineState {
  currentStage: number;
  parsedJD: ParsedJD | null;
  selectedCandidates: CandidateProfile[];
  matchScores: MatchScore[];
  engagements: Record<string, ConversationMessage[]>;
  interestScores: InterestScore[];
  shortlistWeights: { match: number; interest: number };
}
