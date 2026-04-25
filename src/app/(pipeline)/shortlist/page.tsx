"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CandidateProfile } from "@/lib/types";
import {
  ListChecks,
  Download,
  RotateCcw,
  AlertCircle,
  Trophy,
  Users,
  TrendingUp,
  Star,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { MetalButton } from "@/components/ui/liquid-glass-button";

interface ScoringResult {
  candidateId: string;
  totalScore: number;
  strengths: string[];
  gaps: string[];
}

interface InterestResult {
  candidateId: string;
  interestScore: number;
  interestLevel: string;
  reasoning: string;
  redFlags: string[];
}

interface RankedCandidate {
  rank: number;
  candidate: CandidateProfile;
  matchScore: number;
  interestScore: number;
  combinedScore: number;
  strengths: string[];
  redFlags: string[];
}

function badgeColor(score: number) {
  if (score >= 80) return "bg-green-100 text-green-700";
  if (score >= 60) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-600";
}

function rankMedal(rank: number) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Trophy className="w-5 h-5 text-slate-400" />;
  if (rank === 3) return <Trophy className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold text-slate-400 w-5 text-center">{rank}</span>;
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export default function ShortlistPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [matchScores, setMatchScores] = useState<Record<string, ScoringResult>>({});
  const [interestScores, setInterestScores] = useState<Record<string, InterestResult>>({});
  const [matchWeight, setMatchWeight] = useState(60);

  useEffect(() => {
    const cands = localStorage.getItem("selectedCandidates");
    const scores = localStorage.getItem("matchScores");
    const interest = localStorage.getItem("interestScores");
    if (cands) setCandidates(JSON.parse(cands));
    if (scores) setMatchScores(JSON.parse(scores));
    if (interest) setInterestScores(JSON.parse(interest));
  }, []);

  const interestWeight = 100 - matchWeight;

  const ranked: RankedCandidate[] = useMemo(() => {
    const list = candidates.map((c) => {
      const ms = matchScores[c.id]?.totalScore ?? 0;
      const is = interestScores[c.id]?.interestScore ?? 0;
      const combined = Math.round((ms * matchWeight + is * interestWeight) / 100);
      const strengths = matchScores[c.id]?.strengths ?? [];
      const redFlags = interestScores[c.id]?.redFlags ?? [];
      return { candidate: c, matchScore: ms, interestScore: is, combinedScore: combined, strengths, redFlags, rank: 0 };
    });

    list.sort((a, b) => b.combinedScore - a.combinedScore);
    list.forEach((item, i) => { item.rank = i + 1; });
    return list;
  }, [candidates, matchScores, interestScores, matchWeight, interestWeight]);

  // Stats
  const avgMatch = ranked.length > 0 ? Math.round(ranked.reduce((s, r) => s + r.matchScore, 0) / ranked.length) : 0;
  const avgInterest = ranked.length > 0 ? Math.round(ranked.reduce((s, r) => s + r.interestScore, 0) / ranked.length) : 0;
  const above80 = ranked.filter((r) => r.combinedScore >= 80).length;

  const downloadCsv = () => {
    const headers = ["Rank", "Name", "Title", "Company", "Match Score", "Interest Score", "Combined Score", "Key Strengths", "Red Flags"];
    const rows = ranked.map((r) => [
      String(r.rank),
      escapeCsv(r.candidate.name),
      escapeCsv(r.candidate.title),
      escapeCsv(r.candidate.company),
      String(r.matchScore),
      String(r.interestScore),
      String(r.combinedScore),
      escapeCsv(r.strengths.join("; ")),
      escapeCsv(r.redFlags.join("; ")),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shortlist-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNewSearch = () => {
    ["pipeline_completed","parsedJD","selectedCandidates","matchScores","interestScores","engagements"]
      .forEach((k) => localStorage.removeItem(k));
    router.push("/jd-input");
  };

  if (candidates.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700">No Engagement Data Found</h2>
        <p className="text-slate-500">Complete the engagement step first.</p>
        <MetalButton variant="primary" onClick={() => router.push("/engagement")}>
          Go to Engagement
        </MetalButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ListChecks className="w-8 h-8 text-[#1B6B7A]" />
            Final Shortlist
          </h1>
          <p className="text-slate-500">Ranked candidates ready for recruiter action</p>
        </div>
        <MetalButton variant="default" onClick={handleNewSearch}>
          <RotateCcw className="w-4 h-4" />
          Start New Search
        </MetalButton>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5 text-[#1B6B7A]" />} label="Total Candidates" value={String(ranked.length)} />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-blue-500" />} label="Avg Match Score" value={String(avgMatch)} />
        <StatCard icon={<Star className="w-5 h-5 text-amber-500" />} label="Avg Interest Score" value={String(avgInterest)} />
        <StatCard icon={<Trophy className="w-5 h-5 text-green-500" />} label="Combined ≥ 80" value={String(above80)} />
      </div>

      {/* Weight Sliders */}
      <div className="bg-white border border-slate-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-4 h-4 text-[#1B6B7A]" />
          <h3 className="font-semibold text-sm text-slate-700">Scoring Weights</h3>
          <span className="text-xs text-slate-400 ml-auto">Adjust to re-rank in real time</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-[#1B6B7A]">Match {matchWeight}%</span>
            <span className="text-xs text-slate-400">← drag to adjust →</span>
            <span className="font-semibold text-amber-600">Interest {interestWeight}%</span>
          </div>
          <input
            type="range"
            min={0} max={100} value={matchWeight}
            onChange={(e) => setMatchWeight(Number(e.target.value))}
            className="w-full accent-[#1B6B7A]"
          />
          <div className="flex rounded-full overflow-hidden h-2">
            <div className="bg-[#1B6B7A] transition-all duration-200" style={{ width: `${matchWeight}%` }} />
            <div className="bg-amber-400 transition-all duration-200" style={{ width: `${interestWeight}%` }} />
          </div>
        </div>
      </div>

      {/* Shortlist Table */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <div className="responsive-table">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0B1220] text-white text-left sticky top-0 z-10">
                <th className="px-4 py-3 font-semibold w-14 text-center">#</th>
                <th className="px-4 py-3 font-semibold">Candidate</th>
                <th className="px-4 py-3 font-semibold text-center">Match</th>
                <th className="px-4 py-3 font-semibold text-center">Interest</th>
                <th className="px-4 py-3 font-semibold text-center">Combined</th>
                <th className="px-4 py-3 font-semibold">Key Strengths</th>
                <th className="px-4 py-3 font-semibold">Red Flags</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr
                  key={r.candidate.id}
                  className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                  } ${r.rank <= 3 ? "bg-gradient-to-r from-amber-50/40 to-transparent" : ""}`}
                >
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center">{rankMedal(r.rank)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{r.candidate.name}</p>
                    <p className="text-xs text-slate-500">{r.candidate.title} · {r.candidate.company}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold ${badgeColor(r.matchScore)}`}>
                      {r.matchScore}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold ${badgeColor(r.interestScore)}`}>
                      {r.interestScore}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold border-2 ${
                      r.combinedScore >= 80
                        ? "border-green-400 bg-green-50 text-green-700"
                        : r.combinedScore >= 60
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-red-300 bg-red-50 text-red-600"
                    }`}>
                      {r.combinedScore}
                    </span>
                  </td>
                  <td className="px-4 py-4 max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {r.strengths.slice(0, 2).map((s, j) => (
                        <span key={j} className="inline-flex items-center gap-1 text-[11px] bg-green-50 text-green-700 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3" />{s}
                        </span>
                      ))}
                      {r.strengths.length === 0 && <span className="text-xs text-slate-300">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {r.redFlags.map((f, j) => (
                        <span key={j} className="inline-flex items-center gap-1 text-[11px] bg-red-50 text-red-600 rounded-full px-2 py-0.5">
                          <AlertTriangle className="w-3 h-3" />{f}
                        </span>
                      ))}
                      {r.redFlags.length === 0 && <span className="text-xs text-slate-300">None</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <MetalButton variant="default" onClick={handleNewSearch}>
          <RotateCcw className="w-4 h-4" />
          Start New Search
        </MetalButton>
        <MetalButton variant="success" onClick={downloadCsv}>
          <Download className="w-4 h-4" />
          Download CSV
        </MetalButton>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-slate-50">{icon}</div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
