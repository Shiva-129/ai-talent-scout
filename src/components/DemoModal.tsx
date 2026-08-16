"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STAGES = [
  { step: "01", name: "JD Parsing", desc: "Extracts skills & requirements via AI" },
  { step: "02", name: "Candidate Discovery", desc: "Filters & matches top talent" },
  { step: "03", name: "5D Match Scoring", desc: "Weighted multi-criteria analysis" },
  { step: "04", name: "AI Phone Screening", desc: "Simulated dialogue & sentiment scoring" },
  { step: "05", name: "Ranked Shortlist", desc: "Final composite candidate ranking" },
];

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border shadow-2xl z-10"
            style={{
              background: "linear-gradient(145deg, rgba(13, 31, 45, 0.98), rgba(8, 15, 26, 0.99))",
              borderColor: "rgba(103, 192, 144, 0.3)",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(33, 91, 99, 0.4)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shadow-inner"
                  style={{ background: "linear-gradient(135deg, #215B63, #67C090)" }}
                >
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-base sm:text-lg">
                      TalentAI Pipeline Walkthrough
                    </h3>
                    <span
                      className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{
                        background: "rgba(170, 255, 199, 0.1)",
                        color: "#AAFFC7",
                        borderColor: "rgba(170, 255, 199, 0.3)",
                      }}
                    >
                      <Sparkles className="w-3 h-3" /> Live E2E Recording
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">
                    Watch how a job description turns into a ranked candidate shortlist in real-time
                  </p>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
              {/* Video Player Box */}
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-inner group">
                <img
                  src="/demo-walkthrough.webp"
                  alt="TalentAI End-to-End Walkthrough Demo Video"
                  className="w-full h-auto object-contain max-h-[52vh] mx-auto rounded-lg"
                  loading="eager"
                />
              </div>

              {/* Pipeline Stages Walkthrough Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {STAGES.map((s) => (
                  <div
                    key={s.step}
                    className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded" style={{ background: "rgba(33, 91, 99, 0.5)", color: "#AAFFC7" }}>
                        {s.step}
                      </span>
                      <p className="text-white text-xs font-semibold truncate">{s.name}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-[#67C090]" />
                <span>Zero configuration required. Powered by OpenCode Zen.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Close
                </button>
                <Link
                  href="/jd-input"
                  onClick={onClose}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(90deg, #215B63, #67C090)",
                    boxShadow: "0 0 20px rgba(103, 192, 144, 0.3)",
                  }}
                >
                  Try It Live Now <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
