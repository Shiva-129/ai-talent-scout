"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CandidateProfile, ParsedJD } from "@/lib/types";
import { usePipeline } from "@/context/PipelineContext";
import { useToast } from "@/components/Toast";
import { MetalButton } from "@/components/ui/liquid-glass-button";
import {
  UserCheck,
  ArrowRight,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Trophy,
  BarChart3,
} from "lucide-react";

interface ScoringResult {
  candidateId: string;
  scores: { skills: number; experience: number; education: number; location: number; industry: number };
  rationales: { skills: string; experience: string; education: string; location: string; industry: string };
  weights: { skills: number; experience: number; education: number; location: number; industry: number };
  totalScore: number;
  overallSummary: string;
  strengths: string[];
  gaps: string[];
}

const DIMENSION_LABELS: Record<string, { label: string; weight: string }> = {
  skills: { label: "Skills Match", weight: "40%" },
  experience: { label: "Experience", weight: "25%" },
  education: { label: "Education", weight: "15%" },
  location: { label: "Location", weight: "10%" },
  industry: { label: "Industry", weight: "10%" },
};

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-500";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-400";
}

function scoreRing(score: number) {
  if (score >= 80) return "stroke-green-500";
  if (score >= 60) return "stroke-amber-500";
  return "stroke-red-400";
}

function CircularGauge({ score, size = 96 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={scoreRing(score)}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-2xl font-bold ${scoreColor(score)}`}>{score}</span>
      </div>
    </div>
  );
}

export default function ScoringPage() {
  const router = useRouter();
  const { markCompleted } = usePipeline();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [parsedJD, setParsedJD] = useState<ParsedJD | null>(null);
  const [results, setResults] = useState<Map<string, ScoringResult>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scoring, setScoring] = useState(false);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [rateLimitSecs, setRateLimitSecs] = useState<number | null>(null);

  // Load data from localStorage
  useEffect(() => {
    const jdStr = localStorage.getItem("parsedJD");
    const candStr = localStorage.getItem("selectedCandidates");
    if (jdStr) setParsedJD(JSON.parse(jdStr));
    if (candStr) setCandidates(JSON.parse(candStr));
  }, []);

  const scoreAllCandidates = useCallback(async () => {
    if (!parsedJD || candidates.length === 0) return;
    setScoring(true);
    setDone(false);

    for (let i = 0; i < candidates.length; i++) {
      setCurrentIndex(i + 1);
      const candidate = candidates[i];

      try {
        const res = await fetch("/api/score-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidate, parsedJD }),
        });

        if (!res.ok) {
          const err = await res.json();
          if (res.status === 429) {
            const secs = err.retryAfter ?? 60;
            setRateLimitSecs(secs);
            toast("warning", `Rate limit hit — waiting ${secs}s before continuing`);
            await new Promise((r) => {
              let remaining = secs;
              const interval = setInterval(() => {
                remaining -= 1;
                setRateLimitSecs(remaining);
                if (remaining <= 0) { clearInterval(interval); setRateLimitSecs(null); r(undefined); }
              }, 1000);
            });
            i--; // retry same candidate
            continue;
          }
          setErrors((prev) => new Map(prev).set(candidate.id, err.error || "Scoring failed"));
          continue;
        }

        const data: ScoringResult = await res.json();
        setResults((prev) => new Map(prev).set(candidate.id, data));
      } catch {
        setErrors((prev) => new Map(prev).set(candidate.id, "Network error"));
      }
    }

    setScoring(false);
    setDone(true);
    toast("success", `Scoring complete! ${candidates.length} candidates evaluated.`);
  }, [parsedJD, candidates, toast]);

  // Auto-start scoring when data loads
  useEffect(() => {
    if (parsedJD && candidates.length > 0 && results.size === 0 && !scoring && !done) {
      scoreAllCandidates();
    }
  }, [parsedJD, candidates, results.size, scoring, done, scoreAllCandidates]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleProceed = () => {
    // Store results for engagement page
    const resultsObj: Record<string, ScoringResult> = {};
    results.forEach((v, k) => { resultsObj[k] = v; });
    localStorage.setItem("matchScores", JSON.stringify(resultsObj));
    markCompleted("scoring");
    router.push("/engagement");
  };

  // Summary stats
  const allScores = Array.from(results.values());
  const above80 = allScores.filter((r) => r.totalScore >= 80).length;
  const mid = allScores.filter((r) => r.totalScore >= 60 && r.totalScore < 80).length;
  const below60 = allScores.filter((r) => r.totalScore < 60).length;

  // No data state
  if (!parsedJD || candidates.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700">No Candidates Selected</h2>
        <p className="text-slate-500">Please select candidates from the discovery page first.</p>
        <MetalButton variant="primary" onClick={() => router.push("/candidates")}>
          Go to Discovery
        </MetalButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <UserCheck className="w-8 h-8 text-[#1B6B7A]" />
          Match Scoring
        </h1>
        <p className="text-slate-500">AI-powered evaluation across 5 dimensions</p>
      </div>

      {/* Rate limit pause banner */}
      {rateLimitSecs !== null && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Rate limit reached.</strong> Pausing for <strong>{rateLimitSecs}s</strong> then resuming automatically…
          </p>
        </div>
      )}

      {/* Progress Indicator */}
      {scoring && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 flex items-center gap-4">
          <Loader2 className="w-6 h-6 text-[#1B6B7A] animate-spin" />
          <div className="flex-1">
            <p className="font-medium text-slate-800">
              Scoring candidate {currentIndex} of {candidates.length}…
            </p>
            <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[#1B6B7A] rounded-full transition-all duration-500"
                style={{ width: `${(currentIndex / candidates.length) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-sm text-slate-500 font-medium">
            {Math.round((currentIndex / candidates.length) * 100)}%
          </span>
        </div>
      )}

      {/* Summary Bar */}
      {done && allScores.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1B6B7A]" />
            <span className="font-semibold text-slate-800">Summary</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-slate-600"><strong>{above80}</strong> scored 80+</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-slate-600"><strong>{mid}</strong> scored 60–79</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-sm text-slate-600"><strong>{below60}</strong> below 60</span>
          </div>
        </div>
      )}

      {/* Candidate Score Cards */}
      <div className="space-y-4">
        {candidates.map((c) => {
          const result = results.get(c.id);
          const error = errors.get(c.id);
          const isExpanded = expanded.has(c.id);

          return (
            <div key={c.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
              {/* Card Header */}
              <div className="p-5 flex items-center gap-5">
                {/* Score Gauge or Loading */}
                <div className="shrink-0">
                  {result ? (
                    <CircularGauge score={result.totalScore} />
                  ) : error ? (
                    <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-red-400" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Candidate Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-slate-900">{c.name}</h3>
                  <p className="text-sm text-slate-500">{c.title} at {c.company}</p>

                  {result && (
                    <p className="text-sm text-slate-600 mt-2">{result.overallSummary}</p>
                  )}
                  {error && (
                    <p className="text-sm text-red-500 mt-2">Error: {error}</p>
                  )}
                </div>

                {/* Expand Toggle */}
                {result && (
                  <button onClick={() => toggleExpand(c.id)} className="shrink-0 p-2 text-slate-400 hover:text-[#1B6B7A] transition-colors">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                )}
              </div>

              {/* Strengths / Gaps Quick View */}
              {result && !isExpanded && (
                <div className="px-5 pb-4 flex flex-wrap gap-3">
                  {result.strengths.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-2.5 py-1">
                      <CheckCircle2 className="w-3 h-3" />{s}
                    </span>
                  ))}
                  {result.gaps.map((g, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-100 rounded-full px-2.5 py-1">
                      <XCircle className="w-3 h-3" />{g}
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded Breakdown */}
              {result && isExpanded && (
                <div className="border-t border-slate-50 px-5 pb-5 pt-4 space-y-5">
                  {/* Dimension Bars */}
                  <div className="space-y-3">
                    {(Object.keys(DIMENSION_LABELS) as Array<keyof typeof DIMENSION_LABELS>).map((dim) => {
                      const score = result.scores[dim as keyof typeof result.scores];
                      const rationale = result.rationales[dim as keyof typeof result.rationales];
                      const info = DIMENSION_LABELS[dim];

                      return (
                        <div key={dim}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700">
                              {info.label} <span className="text-slate-400 font-normal">({info.weight})</span>
                            </span>
                            <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${scoreBg(score)}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{rationale}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Strengths & Gaps */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
                        <Trophy className="w-4 h-4" /> Key Strengths
                      </h4>
                      <ul className="space-y-1.5">
                        {result.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Gaps & Concerns
                      </h4>
                      <ul className="space-y-1.5">
                        {result.gaps.length === 0 ? (
                          <li className="text-sm text-slate-400 italic">No concerns identified</li>
                        ) : (
                          result.gaps.map((g, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                              {g}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      {done && (
        <div className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-4">
          <p className="text-sm text-slate-500">
            {allScores.length} candidate{allScores.length !== 1 ? "s" : ""} scored successfully
          </p>
          <MetalButton
            variant="primary"
            onClick={handleProceed}
            disabled={allScores.length === 0}
          >
            Proceed to Engagement
            <ArrowRight className="w-4 h-4" />
          </MetalButton>
        </div>
      )}
    </div>
  );
}
