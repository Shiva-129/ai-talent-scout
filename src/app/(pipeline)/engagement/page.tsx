"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CandidateProfile, ConversationMessage, ParsedJD } from "@/lib/types";
import { usePipeline } from "@/context/PipelineContext";
import { useToast } from "@/components/Toast";
import { MetalButton } from "@/components/ui/liquid-glass-button";
import {
  MessageSquare,
  ArrowRight,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  User,
  Headphones,
} from "lucide-react";

interface ScoringResult {
  candidateId: string;
  totalScore: number;
}

interface InterestResult {
  candidateId: string;
  interestScore: number;
  interestLevel: string;
  reasoning: string;
  redFlags: string[];
}

interface EngagementData {
  messages: ConversationMessage[];
  interest: InterestResult | null;
}

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-500 bg-red-50 border-red-200";
}

function levelBadge(level: string) {
  const map: Record<string, string> = {
    "very interested": "bg-green-100 text-green-700",
    interested: "bg-emerald-100 text-emerald-700",
    "moderately interested": "bg-amber-100 text-amber-700",
    passive: "bg-orange-100 text-orange-700",
    "not interested": "bg-red-100 text-red-600",
  };
  return map[level] || "bg-slate-100 text-slate-600";
}

export default function EngagementPage() {
  const router = useRouter();
  const { markCompleted } = usePipeline();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [parsedJD, setParsedJD] = useState<ParsedJD | null>(null);
  const [matchScores, setMatchScores] = useState<Record<string, ScoringResult>>({});
  const [engagements, setEngagements] = useState<Map<string, EngagementData>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const jd = localStorage.getItem("parsedJD");
    const cands = localStorage.getItem("selectedCandidates");
    const scores = localStorage.getItem("matchScores");
    if (jd) setParsedJD(JSON.parse(jd));
    if (cands) setCandidates(JSON.parse(cands));
    if (scores) setMatchScores(JSON.parse(scores));
  }, []);

  const processAll = useCallback(async () => {
    if (!parsedJD || candidates.length === 0) return;
    setProcessing(true);
    setDone(false);

    for (let i = 0; i < candidates.length; i++) {
      setCurrentIndex(i + 1);
      const candidate = candidates[i];

      try {
        // Step 1: Engage
        const engageRes = await fetch("/api/engage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidate, parsedJD }),
        });

        if (!engageRes.ok) {
          const err = await engageRes.json();
          setErrors((p) => new Map(p).set(candidate.id, err.error || "Engagement failed"));
          continue;
        }

        const engageData = await engageRes.json();
        const messages: ConversationMessage[] = engageData.messages;

        // Step 2: Score interest
        const interestRes = await fetch("/api/score-interest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: candidate.id, messages, candidateProfile: candidate }),
        });

        let interest: InterestResult | null = null;
        if (interestRes.ok) {
          interest = await interestRes.json();
        }

        setEngagements((p) => new Map(p).set(candidate.id, { messages, interest }));
      } catch {
        setErrors((p) => new Map(p).set(candidate.id, "Network error"));
      }
    }

    setProcessing(false);
    setDone(true);
    toast("success", `Engagement complete! ${candidates.length} conversations simulated.`);
  }, [parsedJD, candidates, toast]);

  useEffect(() => {
    if (parsedJD && candidates.length > 0 && engagements.size === 0 && !processing && !done) {
      processAll();
    }
  }, [parsedJD, candidates, engagements.size, processing, done, processAll]);

  const toggleExpand = (id: string) => {
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleProceed = () => {
    const interestObj: Record<string, InterestResult> = {};
    const convoObj: Record<string, ConversationMessage[]> = {};
    engagements.forEach((v, k) => {
      if (v.interest) interestObj[k] = v.interest;
      convoObj[k] = v.messages;
    });
    localStorage.setItem("interestScores", JSON.stringify(interestObj));
    localStorage.setItem("engagements", JSON.stringify(convoObj));
    markCompleted("engagement");
    router.push("/shortlist");
  };

  // Transition stats
  const allData = Array.from(engagements.entries());
  const highMatchLowInterest = allData.filter(([id, d]) => {
    const ms = matchScores[id]?.totalScore ?? 0;
    return ms >= 70 && (d.interest?.interestScore ?? 100) < 50;
  }).length;
  const lowMatchHighInterest = allData.filter(([id, d]) => {
    const ms = matchScores[id]?.totalScore ?? 0;
    return ms < 60 && (d.interest?.interestScore ?? 0) >= 70;
  }).length;

  if (!parsedJD || candidates.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700">No Scoring Data Found</h2>
        <p className="text-slate-500">Complete the scoring step first.</p>
        <MetalButton variant="primary" onClick={() => router.push("/scoring")}>
          Go to Scoring
        </MetalButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-[#1B6B7A]" />
          Candidate Engagement
        </h1>
        <p className="text-slate-500">Simulated screening conversations and interest analysis</p>
      </div>

      {/* Progress */}
      {processing && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 flex items-center gap-4">
          <Loader2 className="w-6 h-6 text-[#1B6B7A] animate-spin shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-slate-800">
              Engaging candidate {currentIndex} of {candidates.length}…
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Simulating conversation + scoring interest</p>
            <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-[#1B6B7A] rounded-full transition-all duration-500" style={{ width: `${(currentIndex / candidates.length) * 100}%` }} />
            </div>
          </div>
          <span className="text-sm text-slate-500 font-medium">{Math.round((currentIndex / candidates.length) * 100)}%</span>
        </div>
      )}

      {/* Candidate Cards */}
      <div className="space-y-4">
        {candidates.map((c) => {
          const eng = engagements.get(c.id);
          const error = errors.get(c.id);
          const ms = matchScores[c.id]?.totalScore;
          const isOpen = expanded.has(c.id);

          return (
            <div key={c.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
              {/* Summary Header */}
              <div className="p-5 flex items-center gap-4 cursor-pointer" onClick={() => eng && toggleExpand(c.id)}>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-slate-900">{c.name}</h3>
                  <p className="text-sm text-slate-500">{c.title} at {c.company}</p>
                </div>

                {/* Score Badges */}
                <div className="flex items-center gap-3 shrink-0">
                  {ms != null && (
                    <div className={`text-center px-3 py-1.5 rounded-lg border ${scoreColor(ms)}`}>
                      <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">Match</p>
                      <p className="text-lg font-bold">{ms}</p>
                    </div>
                  )}
                  {eng?.interest && (
                    <div className={`text-center px-3 py-1.5 rounded-lg border ${scoreColor(eng.interest.interestScore)}`}>
                      <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">Interest</p>
                      <p className="text-lg font-bold">{eng.interest.interestScore}</p>
                    </div>
                  )}
                  {!eng && !error && (
                    <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
                  )}
                  {error && (
                    <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">Failed</span>
                  )}
                </div>

                {/* Expand Toggle */}
                {eng && (
                  <div className="text-slate-400">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                )}
              </div>

              {/* Interest Level Badge + Red Flags (collapsed view) */}
              {eng?.interest && !isOpen && (
                <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${levelBadge(eng.interest.interestLevel)}`}>
                    {eng.interest.interestLevel}
                  </span>
                  {eng.interest.redFlags.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-100 rounded-full px-2.5 py-1">
                      <AlertTriangle className="w-3 h-3" />{f}
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded: Transcript + Analysis */}
              {eng && isOpen && (
                <div className="border-t border-slate-50">
                  {/* Chat Transcript */}
                  <div className="px-5 py-4 space-y-3 bg-slate-50/50 max-h-[420px] overflow-y-auto">
                    {eng.messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "recruiter" ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[75%] ${msg.role === "recruiter" ? "order-2" : "order-1"}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            {msg.role === "recruiter" ? (
                              <Headphones className="w-3 h-3 text-blue-500" />
                            ) : (
                              <User className="w-3 h-3 text-slate-400" />
                            )}
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${msg.role === "recruiter" ? "text-blue-500" : "text-slate-400"}`}>
                              {msg.role === "recruiter" ? "Recruiter" : "Candidate"}
                            </span>
                          </div>
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              msg.role === "recruiter"
                                ? "bg-blue-500 text-white rounded-bl-md"
                                : "bg-white border border-slate-200 text-slate-700 rounded-br-md"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Interest Analysis */}
                  {eng.interest && (
                    <div className="px-5 py-4 space-y-3 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm px-3 py-1 rounded-full font-semibold ${levelBadge(eng.interest.interestLevel)}`}>
                          {eng.interest.interestLevel} — {eng.interest.interestScore}/100
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{eng.interest.reasoning}</p>
                      {eng.interest.redFlags.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Red Flags
                          </p>
                          <ul className="space-y-1">
                            {eng.interest.redFlags.map((f, i) => (
                              <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="px-5 pb-4 text-sm text-red-500">{error}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Transition Summary + Proceed */}
      {done && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-xl p-5 flex flex-wrap gap-6 items-center">
            <span className="font-semibold text-slate-800">Transition Summary</span>
            <div className="flex items-center gap-2 text-sm">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-slate-600">
                <strong className="text-red-600">{highMatchLowInterest}</strong> high-match / low-interest flagged
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-slate-600">
                <strong className="text-amber-600">{lowMatchHighInterest}</strong> low-match / high-interest (hidden gem{lowMatchHighInterest !== 1 ? "s" : ""})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-4">
            <p className="text-sm text-slate-500">
              {engagements.size} candidate{engagements.size !== 1 ? "s" : ""} engaged successfully
            </p>
            <MetalButton
              variant="primary"
              onClick={handleProceed}
              disabled={engagements.size === 0}
            >
              Generate Shortlist
              <ArrowRight className="w-4 h-4" />
            </MetalButton>
          </div>
        </div>
      )}
    </div>
  );
}
