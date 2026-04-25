"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { ParsedJD, CandidateProfile, SkillRequirement } from "@/lib/types";
import sampleCandidates from "@/data/candidates";
import { usePipeline } from "@/context/PipelineContext";
import { useToast } from "@/components/Toast";
import { MetalButton } from "@/components/ui/liquid-glass-button";
import {
  Search,
  ArrowRight,
  SlidersHorizontal,
  Users,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Square,
  Upload,
  X,
  FileSpreadsheet,
} from "lucide-react";

// ─── Scoring helpers ──────────────────────────────────────────────────────────

interface ScoredCandidate extends CandidateProfile {
  matchScore: number;
  skillMatchPercent: number;
  matchedSkills: string[];
  experienceScore: number;
  locationScore: number;
}

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9+#]/g, "");
}

function scoreCandidates(all: CandidateProfile[], jd: ParsedJD): ScoredCandidate[] {
  const mandatory = jd.skills.filter((s) => s.importance === "mandatory");
  const preferred = jd.skills.filter((s) => s.importance === "preferred");
  const niceToHave = jd.skills.filter((s) => s.importance === "nice-to-have");
  const maxSkillScore = mandatory.length * 3 + preferred.length * 2 + niceToHave.length * 1;

  return all.map((c) => {
    const cSkills = c.skills.map(normalise);
    const matchSkill = (req: SkillRequirement) =>
      cSkills.some((cs) => cs.includes(normalise(req.name)) || normalise(req.name).includes(cs));

    const mandatoryHits = mandatory.filter(matchSkill);
    const preferredHits = preferred.filter(matchSkill);
    const niceHits = niceToHave.filter(matchSkill);

    const skillScore = mandatoryHits.length * 3 + preferredHits.length * 2 + niceHits.length * 1;
    const skillMatchPercent = maxSkillScore > 0 ? Math.round((skillScore / maxSkillScore) * 100) : 0;
    const matchedSkills = [...mandatoryHits, ...preferredHits, ...niceHits].map((s) => s.name);

    let experienceScore = 10;
    if (jd.experienceMin != null) {
      if (c.experience < jd.experienceMin) {
        experienceScore = Math.max(0, 10 - (jd.experienceMin - c.experience) * 3);
      } else if (c.experience > jd.experienceMin + 8) {
        experienceScore = 7;
      }
    }

    let locationScore = 5;
    if (jd.location) {
      const jdLoc = jd.location.toLowerCase();
      const cLoc = c.location.toLowerCase();
      const isRemoteJD = jdLoc.includes("remote");
      const isRemoteCandidate = cLoc.includes("remote");
      if (isRemoteJD) {
        locationScore = isRemoteCandidate ? 10 : 5;
      } else {
        const jdCity = jdLoc.split(",")[0]?.split("(")[0]?.trim() || "";
        if (jdCity && cLoc.includes(jdCity)) locationScore = 10;
        else if (jdLoc.includes("hybrid") && isRemoteCandidate) locationScore = 8;
        else if (isRemoteCandidate) locationScore = 4;
      }
    }

    const matchScore = Math.min(100, Math.round(
      skillMatchPercent * 0.60 + experienceScore * 2.5 + locationScore * 1.5
    ));

    return { ...c, matchScore, skillMatchPercent, matchedSkills, experienceScore, locationScore };
  });
}

// ─── Excel parsing ────────────────────────────────────────────────────────────

// Maps common column name variations to canonical field names
const COL_MAP: Record<string, string> = {
  name: "name", "full name": "name", fullname: "name",
  title: "title", "job title": "title", jobtitle: "title", role: "title", position: "title",
  company: "company", employer: "company", organization: "company",
  skills: "skills", "skill set": "skills", skillset: "skills", technologies: "skills",
  experience: "experience", "years of experience": "experience", "years experience": "experience",
  yoe: "experience", exp: "experience",
  education: "education", degree: "education", qualification: "education",
  location: "location", city: "location", "work location": "location",
  "salary expectation": "salaryExpectation", "expected salary": "salaryExpectation",
  salary: "salaryExpectation", compensation: "salaryExpectation",
  summary: "summary", about: "summary", bio: "summary", description: "summary",
  email: "email",
  availability: "availability", status: "availability",
};

const VALID_AVAILABILITY = ["actively looking", "open to opportunities", "not looking", "happy where i am"] as const;

function parseExcel(file: File): Promise<CandidateProfile[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rows.length === 0) {
          reject(new Error("EMPTY"));
          return;
        }

        // Normalise header keys
        const firstRow = rows[0];
        const headerMap: Record<string, string> = {};
        for (const rawKey of Object.keys(firstRow)) {
          const normalised = rawKey.toLowerCase().trim().replace(/\s+/g, " ");
          const canonical = COL_MAP[normalised];
          if (canonical) headerMap[rawKey] = canonical;
        }

        // Check required columns
        const presentCanonical = new Set(Object.values(headerMap));
        const required = ["name", "title", "skills", "experience"];
        const missing = required.filter((r) => !presentCanonical.has(r));
        if (missing.length > 0) {
          reject(new Error(`MISSING:${missing.join(",")}`));
          return;
        }

        const candidates: CandidateProfile[] = rows.map((row, idx) => {
          // Get value by canonical field
          const get = (field: string): string => {
            const rawKey = Object.keys(headerMap).find((k) => headerMap[k] === field);
            return rawKey ? String(row[rawKey] ?? "").trim() : "";
          };

          const rawAvailability = get("availability").toLowerCase();
          const availability = (VALID_AVAILABILITY.find((v) => v === rawAvailability) ?? "open to opportunities") as CandidateProfile["availability"];

          const rawSkills = get("skills");
          const skills = rawSkills
            ? rawSkills.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
            : [];

          const rawExp = get("experience");
          const experience = parseInt(rawExp, 10) || 0;

          return {
            id: `upload-${idx}-${Date.now()}`,
            name: get("name") || `Candidate ${idx + 1}`,
            title: get("title") || "Not specified",
            company: get("company") || "Not specified",
            skills,
            experience,
            education: get("education") || "Not specified",
            location: get("location") || "Not specified",
            salaryExpectation: get("salaryExpectation") || null,
            summary: get("summary") || "",
            availability,
          };
        });

        resolve(candidates);
      } catch {
        reject(new Error("PARSE_ERROR"));
      }
    };
    reader.onerror = () => reject(new Error("READ_ERROR"));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Sort type ────────────────────────────────────────────────────────────────
type SortKey = "matchScore" | "name" | "experience" | "skillMatchPercent";
type SortDir = "asc" | "desc";

// ─── Component ────────────────────────────────────────────────────────────────
export default function CandidatesPage() {
  const router = useRouter();
  const { markCompleted } = usePipeline();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedJD, setParsedJD] = useState<ParsedJD | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploadedCandidates, setUploadedCandidates] = useState<CandidateProfile[] | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [minMatch, setMinMatch] = useState(0);
  const [locationFilter, setLocationFilter] = useState("all");
  const [expMin, setExpMin] = useState(0);
  const [expMax, setExpMax] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("matchScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    const stored = localStorage.getItem("parsedJD");
    if (stored) {
      try { setParsedJD(JSON.parse(stored)); } catch { setParsedJD(null); }
    }
  }, []);

  const activeCandidates = uploadedCandidates ?? sampleCandidates;

  const scored = useMemo(() => {
    if (!parsedJD) return [];
    return scoreCandidates(activeCandidates, parsedJD);
  }, [parsedJD, activeCandidates]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set(activeCandidates.map((c) => {
      if (c.location.toLowerCase().includes("remote")) return "Remote";
      return c.location.split(",")[0]?.trim() || c.location;
    }));
    return Array.from(locs).sort();
  }, [activeCandidates]);

  const filtered = useMemo(() => {
    let results = scored.filter((c) => {
      if (c.matchScore < minMatch) return false;
      if (c.experience < expMin || c.experience > expMax) return false;
      if (locationFilter !== "all") {
        const isRemote = c.location.toLowerCase().includes("remote");
        if (locationFilter === "Remote" && !isRemote) return false;
        if (locationFilter !== "Remote" && !isRemote && !c.location.includes(locationFilter)) return false;
      }
      return true;
    });

    results.sort((a, b) => {
      let av: string | number = a[sortKey];
      let bv: string | number = b[sortKey];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return results.slice(0, 50);
  }, [scored, minMatch, locationFilter, expMin, expMax, sortKey, sortDir]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      const parsed = await parseExcel(file);
      setUploadedCandidates(parsed);
      setUploadedFileName(file.name);
      setSelectedIds(new Set());
      setLocationFilter("all");
      setMinMatch(0);
      toast("success", `Successfully loaded ${parsed.length} candidates from file.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "EMPTY") {
        toast("error", "The uploaded file contains no candidate data. Please check your file and try again.");
      } else if (msg.startsWith("MISSING:")) {
        const cols = msg.replace("MISSING:", "").split(",").join(", ");
        toast("error", `Missing required columns: ${cols}. Please ensure your file has: Name, Title, Skills, Experience.`);
      } else {
        toast("error", "Failed to parse file. Please check the format and try again.");
      }
    }
  };

  const clearUpload = () => {
    setUploadedCandidates(null);
    setUploadedFileName(null);
    setSelectedIds(new Set());
    setLocationFilter("all");
    setMinMatch(0);
    toast("info", "Reverted to sample candidates.");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((c) => c.id)));
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-[#1B6B7A]" />
      : <ChevronDown className="w-3 h-3 text-[#1B6B7A]" />;
  };

  const handleProceed = () => {
    const selected = activeCandidates.filter((c) => selectedIds.has(c.id));
    localStorage.setItem("selectedCandidates", JSON.stringify(selected));
    markCompleted("candidates");
    router.push("/scoring");
  };

  if (!parsedJD) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700">No Job Description Found</h2>
        <p className="text-slate-500">Please parse a JD first before discovering candidates.</p>
        <MetalButton variant="primary" onClick={() => router.push("/jd-input")}>
          Go to JD Input
        </MetalButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Search className="w-8 h-8 text-[#1B6B7A]" />
            Candidate Discovery
          </h1>
          <p className="text-slate-500">
            Showing top matches for <span className="font-medium text-slate-700">{parsedJD.title}</span>
          </p>
        </div>

        {/* Upload controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {uploadedFileName ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm">
              <FileSpreadsheet className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="text-teal-700 font-medium max-w-[180px] truncate">{uploadedFileName}</span>
              <button
                onClick={clearUpload}
                className="text-teal-500 hover:text-teal-700 transition-colors ml-1"
                title="Clear upload and use sample data"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <MetalButton
            variant="success"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            Upload Candidates
          </MetalButton>

          <div className="text-right text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{filtered.length}</span> shown ·{" "}
            <span className="font-semibold text-[#1B6B7A]">{selectedIds.size}</span> selected
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-4 h-4 text-[#1B6B7A]" />
          <h3 className="font-semibold text-sm text-slate-700">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Min Match Score: <span className="text-slate-800 font-semibold">{minMatch}%</span>
            </label>
            <input type="range" min={0} max={100} value={minMatch}
              onChange={(e) => setMinMatch(Number(e.target.value))}
              className="w-full accent-[#1B6B7A]" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B6B7A]">
              <option value="all">All Locations</option>
              <option value="Remote">Remote</option>
              {uniqueLocations.filter((l) => l !== "Remote").map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Experience: <span className="text-slate-800 font-semibold">{expMin}–{expMax === 20 ? "20+" : expMax} yrs</span>
            </label>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={20} value={expMin}
                onChange={(e) => { const v = Number(e.target.value); setExpMin(v); if (v > expMax) setExpMax(v); }}
                className="w-full accent-[#1B6B7A]" />
              <input type="range" min={0} max={20} value={expMax}
                onChange={(e) => { const v = Number(e.target.value); setExpMax(v); if (v < expMin) setExpMin(v); }}
                className="w-full accent-[#1B6B7A]" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <div className="responsive-table">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left sticky top-0 z-10">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-[#1B6B7A]">
                    {selectedIds.size === filtered.length && filtered.length > 0
                      ? <CheckSquare className="w-4 h-4 text-[#1B6B7A]" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none" onClick={() => handleSort("name")}>
                  <span className="inline-flex items-center gap-1">Name <SortIcon col="name" /></span>
                </th>
                <th className="px-4 py-3 font-semibold text-slate-600">Title</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Company</th>
                <th className="px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none" onClick={() => handleSort("skillMatchPercent")}>
                  <span className="inline-flex items-center gap-1">Skills Match <SortIcon col="skillMatchPercent" /></span>
                </th>
                <th className="px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none" onClick={() => handleSort("experience")}>
                  <span className="inline-flex items-center gap-1">Exp <SortIcon col="experience" /></span>
                </th>
                <th className="px-4 py-3 font-semibold text-slate-600">Location</th>
                <th className="px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none" onClick={() => handleSort("matchScore")}>
                  <span className="inline-flex items-center gap-1">Score <SortIcon col="matchScore" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No candidates match the current filters. Try adjusting your criteria.
                  </td>
                </tr>
              )}
              {filtered.map((c, i) => (
                <tr key={c.id} className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${
                  selectedIds.has(c.id) ? "bg-teal-50/40" : i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                }`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(c.id)} className="text-slate-400 hover:text-[#1B6B7A]">
                      {selectedIds.has(c.id)
                        ? <CheckSquare className="w-4 h-4 text-[#1B6B7A]" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.title}</td>
                  <td className="px-4 py-3 text-slate-500">{c.company}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          c.skillMatchPercent >= 70 ? "bg-green-500" : c.skillMatchPercent >= 40 ? "bg-amber-500" : "bg-red-400"
                        }`} style={{ width: `${c.skillMatchPercent}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{c.skillMatchPercent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.experience} yrs</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.location}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold ${
                      c.matchScore >= 70 ? "bg-green-100 text-green-700"
                      : c.matchScore >= 45 ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-600"
                    }`}>
                      {c.matchScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-4">
        <p className="text-sm text-slate-500">
          {selectedIds.size > 0
            ? `${selectedIds.size} candidate${selectedIds.size > 1 ? "s" : ""} selected for scoring`
            : "Select candidates to proceed to AI scoring"}
        </p>
        <MetalButton variant="primary" onClick={handleProceed} disabled={selectedIds.size === 0}>
          Score & Engage Selected
          <ArrowRight className="w-4 h-4" />
        </MetalButton>
      </div>
    </div>
  );
}
