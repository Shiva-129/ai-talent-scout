"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  FileSearch,
  Users,
  MessageSquare,
  BarChart3,
  Trophy,
  Download,
  Upload,
  Zap,
  ListChecks,
  Play,
  GitFork,
  Globe,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { LiquidButton, LiquidLink } from "@/components/ui/liquid-glass-button";

// ─── Palette tokens ──────────────────────────────────────────────────────────
// #AAFFC7 — mint (highlights, gradient text end)
// #67C090 — medium green (gradient mid, icons)
// #215B63 — deep teal (card borders, accents)
// #124170 — dark navy-blue (aurora blobs, section bg)

// ─── Reusable fade-up wrapper ────────────────────────────────────────────────
function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Candidate card mockup ───────────────────────────────────────────────────
function CandidateCardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 60, rotateY: -15 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
      whileHover={{ rotateY: 4, rotateX: -2, scale: 1.02 }}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      className="relative w-full max-w-sm mx-auto"
    >
      {/* Glow behind card */}
      <div className="absolute inset-0 rounded-2xl blur-2xl scale-110" style={{ background: "rgba(33,91,99,0.5)" }} />

      {/* Card */}
      <div
        className="relative rounded-2xl p-6 border"
        style={{ background: "rgba(18,65,112,0.35)", backdropFilter: "blur(20px)", borderColor: "rgba(103,192,144,0.2)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: "linear-gradient(135deg, #215B63, #67C090)" }}>
            JL
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Jennifer Liu</p>
            <p className="text-slate-400 text-xs">Senior Backend Engineer · Plaid</p>
          </div>
          {/* Match ring */}
          <div className="ml-auto relative w-14 h-14">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke="url(#scoreGrad)" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 22 * 0.88} ${2 * Math.PI * 22}`}
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#215B63" />
                  <stop offset="100%" stopColor="#AAFFC7" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">88</span>
          </div>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {["Python", "Node.js", "AWS", "Kafka"].map((s) => (
            <span key={s} className="text-[11px] px-2 py-0.5 rounded-full border" style={{ background: "rgba(103,192,144,0.15)", color: "#AAFFC7", borderColor: "rgba(103,192,144,0.3)" }}>
              {s}
            </span>
          ))}
        </div>

        {/* Score bars */}
        {[
          { label: "Skills Match", val: 92 },
          { label: "Experience", val: 85 },
          { label: "Interest Score", val: 91 },
        ].map(({ label, val }) => (
          <div key={label} className="mb-2">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">{label}</span>
              <span className="text-white font-medium">{val}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${val}%` }}
                transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #215B63, #AAFFC7)" }}
              />
            </div>
          </div>
        ))}

        {/* Badges */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full font-medium border" style={{ background: "rgba(170,255,199,0.1)", color: "#AAFFC7", borderColor: "rgba(170,255,199,0.25)" }}>
            🥇 Rank #1
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-full font-medium border" style={{ background: "rgba(33,91,99,0.3)", color: "#67C090", borderColor: "rgba(103,192,144,0.3)" }}>
            Very Interested
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Floating decorative dots ────────────────────────────────────────────────
const FLOATERS = [
  { size: 8,  top: "12%", left: "8%",   dur: 6, delay: 0   },
  { size: 5,  top: "25%", left: "18%",  dur: 8, delay: 1   },
  { size: 10, top: "60%", left: "5%",   dur: 7, delay: 2   },
  { size: 6,  top: "75%", left: "15%",  dur: 9, delay: 0.5 },
  { size: 8,  top: "20%", right: "10%", dur: 7, delay: 1.5 },
  { size: 5,  top: "50%", right: "6%",  dur: 6, delay: 3   },
  { size: 12, top: "80%", right: "12%", dur: 8, delay: 2   },
];

// ─── Data ────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: FileSearch,    title: "AI-Powered JD Parsing",               desc: "Paste any job description and our AI extracts requirements, skills, and preferences in seconds." },
  { icon: Users,         title: "Smart Candidate Matching",            desc: "Multi-factor scoring evaluates skills, experience, education, and location alignment." },
  { icon: MessageSquare, title: "Conversational Interest Assessment",  desc: "Simulated conversations reveal genuine candidate interest beyond what resumes show." },
  { icon: BarChart3,     title: "Explainable Scoring",                 desc: "Every score comes with a clear breakdown so you know exactly why a candidate was ranked." },
  { icon: Trophy,        title: "Ranked Shortlist",                    desc: "Combined Match + Interest scores give you an actionable shortlist, not just a list of names." },
  { icon: Download,      title: "Export & Integrate",                  desc: "Download shortlists as CSV or connect to your ATS. Your data, your workflow." },
];

const STEPS = [
  { icon: Upload,     num: "01", title: "Upload JD",      desc: "Paste or upload your job description. Our AI parses it into structured requirements." },
  { icon: Zap,        num: "02", title: "AI Scouting",    desc: "Candidates are discovered, scored on match quality, and engaged in simulated conversations." },
  { icon: ListChecks, num: "03", title: "Get Shortlist",  desc: "Receive a ranked shortlist with Match Score, Interest Score, and detailed explanations." },
];

const STATS = [
  { value: "50K+", label: "Candidates Processed" },
  { value: "92%",  label: "Match Accuracy" },
  { value: "3x",   label: "Faster Hiring" },
  { value: "85%",  label: "Interest Prediction Rate" },
];

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "linear-gradient(135deg, #080f1a 0%, #0d1f2d 100%)" }}>

      {/* ── Aurora background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="aurora-blob aurora-1" />
        <div className="aurora-blob aurora-2" />
        <div className="aurora-blob aurora-3" />
        <div className="aurora-blob aurora-4" />
      </div>

      {/* ── Floating dots ── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        {FLOATERS.map((f, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: f.size, height: f.size,
              top: f.top,
              left: (f as { left?: string }).left,
              right: (f as { right?: string }).right,
              background: "rgba(103,192,144,0.25)",
              border: "1px solid rgba(170,255,199,0.3)",
              animation: `floatDot ${f.dur}s ease-in-out ${f.delay}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-6">
                <span className="text-white">Find Your Perfect</span>
                <br />
                <span style={{ background: "linear-gradient(90deg, #67C090, #AAFFC7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Hire, Powered by AI
                </span>
              </h1>

              <p className="text-lg leading-relaxed mb-10 max-w-lg" style={{ color: "#94A3B8" }}>
                Upload a job description. Our AI discovers, scores, and engages candidates —
                delivering a ranked shortlist in minutes, not weeks.
              </p>

              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-sm opacity-70" style={{ background: "linear-gradient(90deg, #215B63, #67C090)" }} />
                  <LiquidLink
                    href="/jd-input"
                    size="lg"
                    className="relative text-white font-semibold"
                    style={{ background: "linear-gradient(90deg, #215B63, #67C090)" } as React.CSSProperties}
                  >
                    Start Scouting <ArrowRight className="w-4 h-4" />
                  </LiquidLink>
                </div>
                <LiquidButton size="lg" className="text-white font-semibold" style={{ border: "1px solid rgba(255,255,255,0.2)" } as React.CSSProperties}>
                  <Play className="w-4 h-4" /> Watch Demo
                </LiquidButton>
              </div>
            </motion.div>

            {/* Right — card mockup */}
            <div className="hidden lg:block">
              <CandidateCardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════ */}
      <section id="features" className="py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#67C090" }}>Capabilities</p>
            <h2 className="text-4xl font-bold text-white mb-4">Why TalentAI?</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "#94A3B8" }}>
              Everything you need to go from job description to shortlist — without the manual grind.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <FadeUp key={title} delay={i * 0.08}>
                <div
                  className="group h-full rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1"
                  style={{ background: "rgba(18,65,112,0.15)", backdropFilter: "blur(12px)", borderColor: "rgba(33,91,99,0.4)" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(103,192,144,0.5)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(33,91,99,0.4)")}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: "linear-gradient(135deg, #215B63, #67C090)" }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-28" style={{ background: "rgba(18,65,112,0.08)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "#AAFFC7" }}>Process</p>
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "#94A3B8" }}>
              Three steps from job description to ranked shortlist.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px"
              style={{ background: "linear-gradient(90deg, rgba(33,91,99,0.5), rgba(170,255,199,0.4), rgba(33,91,99,0.5))" }} />

            {STEPS.map(({ icon: Icon, num, title, desc }, i) => (
              <FadeUp key={title} delay={i * 0.15}>
                <div className="relative flex flex-col items-center text-center p-8 rounded-2xl border transition-all duration-300"
                  style={{ background: "rgba(18,65,112,0.15)", backdropFilter: "blur(12px)", borderColor: "rgba(33,91,99,0.4)" }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 relative z-10"
                    style={{ background: "linear-gradient(135deg, #215B63, #67C090)", boxShadow: "0 0 24px rgba(33,91,99,0.6)" }}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs font-bold tracking-widest mb-2" style={{ color: "#67C090" }}>{num}</span>
                  <h3 className="text-white font-bold text-xl mb-3">{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          STATS
      ══════════════════════════════════════════════════════ */}
      <section className="py-20" style={{ background: "#0a1520" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label }, i) => (
              <FadeUp key={label} delay={i * 0.1} className="text-center">
                <p className="text-5xl font-extrabold mb-2"
                  style={{ background: "linear-gradient(90deg, #67C090, #AAFFC7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {value}
                </p>
                <p className="text-sm" style={{ color: "#94A3B8" }}>{label}</p>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════ */}
      <section className="py-28 relative">
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, #67C090, transparent)" }} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeUp>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
              Ready to Transform<br />
              <span style={{ background: "linear-gradient(90deg, #67C090, #AAFFC7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Your Hiring?
              </span>
            </h2>
            <p className="text-lg mb-10" style={{ color: "#94A3B8" }}>
              Start scouting for free. No credit card required.
            </p>
            <div className="relative inline-block">
              <div className="absolute inset-0 rounded-full blur-md opacity-60"
                style={{ background: "linear-gradient(90deg, #215B63, #67C090)" }} />
              <LiquidLink
                href="/jd-input"
                size="xl"
                className="relative text-white font-bold text-lg"
                style={{ background: "linear-gradient(90deg, #215B63, #67C090)" } as React.CSSProperties}
              >
                Get Started Free <ArrowRight className="w-5 h-5" />
              </LiquidLink>
            </div>
            <p className="mt-5 text-sm" style={{ color: "#64748B" }}>
              Already have an account?{" "}
              <a href="#" className="hover:text-white underline underline-offset-2 transition-colors" style={{ color: "#94A3B8" }}>
                Schedule a Demo
              </a>
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer style={{ background: "#060d14" }} className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ borderColor: "rgba(33,91,99,0.3)" }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-bold text-lg"
              style={{ background: "linear-gradient(90deg, #67C090, #AAFFC7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              TalentAI
            </p>
            <p className="text-sm" style={{ color: "#475569" }}>© 2026 TalentAI. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {[GitFork, Globe, ExternalLink].map((Icon, i) => (
                <a key={i} href="#" className="transition-colors hover:text-white" style={{ color: "#475569" }}>
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── Global styles ── */}
      <style>{`
        .aurora-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.2;
          animation: auroraMove 12s ease-in-out infinite alternate;
        }
        .aurora-1 { width:600px; height:600px; background:#124170; top:-100px; left:-100px; animation-duration:14s; }
        .aurora-2 { width:500px; height:500px; background:#215B63; top:20%; right:-80px; animation-duration:10s; animation-delay:2s; }
        .aurora-3 { width:400px; height:400px; background:#124170; bottom:10%; left:20%; animation-duration:16s; animation-delay:1s; }
        .aurora-4 { width:350px; height:350px; background:#215B63; bottom:-50px; right:15%; animation-duration:11s; animation-delay:3s; }

        @keyframes auroraMove {
          0%   { transform: translate(0,0) scale(1); }
          50%  { transform: translate(40px,30px) scale(1.08); }
          100% { transform: translate(-20px,50px) scale(0.95); }
        }
        @keyframes floatDot {
          0%   { transform: translateY(0); opacity:0.3; }
          100% { transform: translateY(-18px); opacity:0.7; }
        }
      `}</style>
    </div>
  );
}
