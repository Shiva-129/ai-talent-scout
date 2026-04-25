"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Briefcase } from "lucide-react";
import { LiquidLink } from "@/components/ui/liquid-glass-button";

interface NavbarProps {
  pipeline?: boolean;
}

export default function Navbar({ pipeline = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (pipeline) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pipeline]);

  if (pipeline) {
    return (
      <header className="bg-[#0B1220] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-7 h-7">
              <Brain className="w-7 h-7 absolute" style={{ color: "#67C090" }} />
              <Briefcase className="w-3.5 h-3.5 absolute bottom-0 right-0" style={{ color: "#AAFFC7" }} />
            </div>
            <span className="font-bold text-base tracking-tight" style={{ background: "linear-gradient(90deg, #67C090, #AAFFC7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              TalentAI
            </span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0E1A]/90 backdrop-blur-md border-b border-white/5 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-8 h-8">
            <Brain className="w-8 h-8 absolute" style={{ color: "#67C090" }} />
            <Briefcase className="w-4 h-4 absolute bottom-0 right-0" style={{ color: "#AAFFC7" }} />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ background: "linear-gradient(90deg, #67C090, #AAFFC7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            TalentAI
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {["Features", "How It Works", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {item}
            </a>
          ))}
          <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">
            Login
          </a>
          <LiquidLink
            href="/jd-input"
            size="sm"
            className="hidden md:inline-flex text-white font-semibold"
            style={{ background: "linear-gradient(90deg, #215B63, #67C090)" } as React.CSSProperties}
          >
            Get Started
          </LiquidLink>
        </nav>

        {/* Mobile CTA */}
        <LiquidLink
          href="/jd-input"
          size="sm"
          className="md:hidden text-white font-semibold text-xs"
          style={{ background: "linear-gradient(90deg, #215B63, #67C090)" } as React.CSSProperties}
        >
          Get Started
        </LiquidLink>
      </div>
    </header>
  );
}
