"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ParsedJD, SkillRequirement } from "@/lib/types";
import { usePipeline } from "@/context/PipelineContext";
import { useToast } from "@/components/Toast";
import { FieldsSkeleton, OverlayLoader } from "@/components/Skeletons";
import { MetalButton } from "@/components/ui/liquid-glass-button";
import {
  FileText,
  Loader2,
  ArrowRight,
  Briefcase,
  MapPin,
  GraduationCap,
  Clock,
  DollarSign,
  Building2,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function JDInputPage() {
  const router = useRouter();
  const { markCompleted } = usePipeline();
  const { toast } = useToast();
  const [jdText, setJdText] = useState("");
  const [parsedJD, setParsedJD] = useState<ParsedJD | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const handleParse = async () => {
    const trimmed = jdText.trim();
    if (!trimmed) {
      setError("Please paste a job description first.");
      toast("warning", "Please paste a job description.");
      return;
    }
    if (trimmed.length < 50) {
      setError("Job description is too short (minimum 50 characters). Please provide a more detailed JD for accurate parsing.");
      toast("warning", "JD too short — provide more detail for accurate results.");
      return;
    }

    setLoading(true);
    setError(null);
    setParsedJD(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jdText }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          const secs = data.retryAfter ?? 60;
          setRetryAfter(secs);
          const countdown = setInterval(() => {
            setRetryAfter((prev) => {
              if (prev === null || prev <= 1) { clearInterval(countdown); return null; }
              return prev - 1;
            });
          }, 1000);
          toast("warning", `Rate limit hit — retry in ${secs}s`);
        } else {
          setError(data.error || "Failed to parse job description.");
          toast("error", data.error || "Failed to parse JD.");
        }
        return;
      }

      setParsedJD(data as ParsedJD);
      toast("success", "Job description parsed successfully!");
    } catch (e) {
      const msg = e instanceof DOMException && e.name === "AbortError"
        ? "Request timed out. The AI took too long — please try again."
        : "Network error. Please check your connection and try again.";
      setError(msg);
      toast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (!parsedJD) return;
    localStorage.setItem("parsedJD", JSON.stringify(parsedJD));
    markCompleted("jd-input");
    router.push("/candidates");
  };

  const importanceBadge = (importance: SkillRequirement["importance"]) => {
    const styles = {
      mandatory: "bg-red-100 text-red-700 border-red-200",
      preferred: "bg-amber-100 text-amber-700 border-amber-200",
      "nice-to-have": "bg-green-100 text-green-700 border-green-200",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[importance]}`}>
        {importance}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <FileText className="w-8 h-8 text-[#1B6B7A]" />
          Job Description Input
        </h1>
        <p className="text-slate-500">
          Paste a job description below and our AI will extract the key requirements.
        </p>
      </div>

      {/* Textarea */}
      <div className="space-y-3">
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste the full job description here...

Example:
We are looking for a Senior Backend Engineer with 5+ years of experience in Python, Node.js, and AWS. The role requires expertise in PostgreSQL, Docker, and building RESTful APIs. Experience with Kafka and microservices architecture is preferred. Located in San Francisco (hybrid). Salary range: $150,000 - $190,000."
          className="w-full h-64 p-4 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#1B6B7A] focus:border-transparent transition-all text-sm leading-relaxed"
          disabled={loading}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {jdText.length > 0 ? `${jdText.length} characters` : "Min 20 characters"}
          </span>
          <MetalButton
            variant="primary"
            onClick={handleParse}
            disabled={loading || jdText.trim().length < 20}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Parse JD
              </>
            )}
          </MetalButton>
        </div>
      </div>

      {/* Rate limit banner */}
      {retryAfter !== null && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Too many requests</p>
            <p className="text-sm mt-0.5">The API is busy right now. Retrying in <strong>{retryAfter}s</strong>…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && <FieldsSkeleton />}

      {/* Overlay Loader */}
      {loading && <OverlayLoader message="Parsing job description..." />}

      {/* Parsed Results */}
      {parsedJD && !loading && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1B6B7A]" />
            Parsed Requirements
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Job Title */}
            <InfoCard
              icon={<Briefcase className="w-5 h-5 text-[#1B6B7A]" />}
              label="Job Title"
              value={parsedJD.title || "Not specified"}
            />

            {/* Experience */}
            <InfoCard
              icon={<Clock className="w-5 h-5 text-[#1B6B7A]" />}
              label="Minimum Experience"
              value={parsedJD.experienceMin != null ? `${parsedJD.experienceMin} years` : "Not specified"}
            />

            {/* Education */}
            <InfoCard
              icon={<GraduationCap className="w-5 h-5 text-[#1B6B7A]" />}
              label="Education"
              value={parsedJD.education || "Not specified"}
            />

            {/* Location */}
            <InfoCard
              icon={<MapPin className="w-5 h-5 text-[#1B6B7A]" />}
              label="Location"
              value={parsedJD.location || "Not specified"}
            />

            {/* Salary */}
            <InfoCard
              icon={<DollarSign className="w-5 h-5 text-[#1B6B7A]" />}
              label="Salary Range"
              value={parsedJD.salaryRange || "Not specified"}
            />

            {/* Industry */}
            <InfoCard
              icon={<Building2 className="w-5 h-5 text-[#1B6B7A]" />}
              label="Industry"
              value={parsedJD.industry || "Not specified"}
            />
          </div>

          {/* Skills */}
          <div className="bg-white border border-slate-100 rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {parsedJD.skills?.map((skill, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                >
                  <span className="text-sm font-medium text-slate-800">{skill.name}</span>
                  {importanceBadge(skill.importance)}
                </div>
              ))}
              {(!parsedJD.skills || parsedJD.skills.length === 0) && (
                <p className="text-sm text-slate-400">No skills extracted</p>
              )}
            </div>
          </div>

          {/* Proceed Button */}
          <div className="flex justify-end pt-4">
            <MetalButton variant="primary" onClick={handleProceed}>
              Proceed to Discovery
              <ArrowRight className="w-5 h-5" />
            </MetalButton>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-5 flex items-start gap-3 hover:shadow-sm transition-shadow">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-1">{value}</p>
      </div>
    </div>
  );
}
