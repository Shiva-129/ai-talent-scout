"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CandidateProfile, ParsedJD } from "@/lib/types";

export const STAGES = [
  { key: "jd-input", label: "JD Input", path: "/jd-input" },
  { key: "candidates", label: "Discovery", path: "/candidates" },
  { key: "scoring", label: "Scoring", path: "/scoring" },
  { key: "engagement", label: "Engagement", path: "/engagement" },
  { key: "shortlist", label: "Shortlist", path: "/shortlist" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

interface PipelineContextType {
  completedStages: Set<StageKey>;
  currentStage: StageKey | null;
  markCompleted: (stage: StageKey) => void;
  parsedJD: ParsedJD | null;
  setParsedJD: (jd: ParsedJD | null) => void;
  selectedCandidates: CandidateProfile[];
  setSelectedCandidates: (c: CandidateProfile[]) => void;
}

const PipelineContext = createContext<PipelineContextType | null>(null);

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used within PipelineProvider");
  return ctx;
}

export function PipelineProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [completedStages, setCompleted] = useState<Set<StageKey>>(new Set());
  const [parsedJD, setParsedJDState] = useState<ParsedJD | null>(null);
  const [selectedCandidates, setSelectedCandidatesState] = useState<CandidateProfile[]>([]);

  // Derive current stage from pathname
  const currentStage: StageKey | null =
    STAGES.find((s) => pathname === s.path)?.key ?? null;

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pipeline_completed");
      if (saved) setCompleted(new Set(JSON.parse(saved)));
      const jd = localStorage.getItem("parsedJD");
      if (jd) setParsedJDState(JSON.parse(jd));
      const cands = localStorage.getItem("selectedCandidates");
      if (cands) setSelectedCandidatesState(JSON.parse(cands));
    } catch { /* ignore */ }
  }, []);

  const markCompleted = useCallback((stage: StageKey) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(stage);
      localStorage.setItem("pipeline_completed", JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const setParsedJD = useCallback((jd: ParsedJD | null) => {
    setParsedJDState(jd);
    if (jd) localStorage.setItem("parsedJD", JSON.stringify(jd));
    else localStorage.removeItem("parsedJD");
  }, []);

  const setSelectedCandidates = useCallback((c: CandidateProfile[]) => {
    setSelectedCandidatesState(c);
    if (c.length > 0) localStorage.setItem("selectedCandidates", JSON.stringify(c));
    else localStorage.removeItem("selectedCandidates");
  }, []);

  return (
    <PipelineContext.Provider
      value={{ completedStages, currentStage, markCompleted, parsedJD, setParsedJD, selectedCandidates, setSelectedCandidates }}
    >
      {children}
    </PipelineContext.Provider>
  );
}
