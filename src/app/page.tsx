import Link from "next/link";
import { ArrowRight, FileText, Search, UserCheck, MessageSquare, ListChecks } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[70vh] text-center space-y-8 sm:space-y-12 px-2">
      <div className="space-y-4 sm:space-y-6 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
          AI Talent Scout
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-slate-600 font-light">
          AI-Powered Candidate Sourcing & Engagement
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 w-full max-w-5xl">
        <FeatureCard 
          icon={<FileText className="w-7 h-7 sm:w-8 sm:h-8 mb-3 sm:mb-4 text-[#1B6B7A]" />}
          title="1. JD Input"
          description="Parse job descriptions instantly"
        />
        <FeatureCard 
          icon={<Search className="w-7 h-7 sm:w-8 sm:h-8 mb-3 sm:mb-4 text-[#1B6B7A]" />}
          title="2. Discovery"
          description="Find the perfect matches"
        />
        <FeatureCard 
          icon={<UserCheck className="w-7 h-7 sm:w-8 sm:h-8 mb-3 sm:mb-4 text-[#1B6B7A]" />}
          title="3. Scoring"
          description="AI-driven 5-dimension scoring"
        />
        <FeatureCard 
          icon={<MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 mb-3 sm:mb-4 text-[#1B6B7A]" />}
          title="4. Engagement"
          description="Simulated screening calls"
        />
        <FeatureCard 
          icon={<ListChecks className="w-7 h-7 sm:w-8 sm:h-8 mb-3 sm:mb-4 text-[#1B6B7A]" />}
          title="5. Shortlist"
          description="Ranked & exportable results"
        />
      </div>

      <div className="pt-4 sm:pt-8">
        <Link 
          href="/jd-input" 
          className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white bg-[#1B6B7A] rounded-full hover:bg-[#155a67] transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          Start New Search
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-all hover:-translate-y-0.5">
      {icon}
      <h3 className="font-semibold text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500">{description}</p>
    </div>
  );
}
