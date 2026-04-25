"use client";

import Link from "next/link";
import { STAGES, StageKey, usePipeline } from "@/context/PipelineContext";
import { Check, FileText, Search, UserCheck, MessageSquare, ListChecks } from "lucide-react";

const STAGE_ICONS: Record<StageKey, React.ReactNode> = {
  "jd-input": <FileText className="w-4 h-4" />,
  candidates: <Search className="w-4 h-4" />,
  scoring: <UserCheck className="w-4 h-4" />,
  engagement: <MessageSquare className="w-4 h-4" />,
  shortlist: <ListChecks className="w-4 h-4" />,
};

export default function PipelineStepper() {
  const { completedStages, currentStage } = usePipeline();

  return (
    <div className="bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          {STAGES.map((stage, i) => {
            const isCompleted = completedStages.has(stage.key);
            const isCurrent = currentStage === stage.key;
            const isClickable = isCompleted || isCurrent;

            return (
              <div key={stage.key} className="flex items-center flex-1 last:flex-none">
                {isClickable ? (
                  <Link href={stage.path} className="group flex flex-col items-center gap-1 min-w-0">
                    <StepCircle isCompleted={isCompleted} isCurrent={isCurrent} stageKey={stage.key} />
                    <span className={`hidden sm:block text-[11px] font-medium transition-colors text-center ${
                      isCurrent ? "text-[#1B6B7A]" : isCompleted ? "text-green-600" : "text-slate-400"
                    } group-hover:text-[#1B6B7A]`}>
                      {stage.label}
                    </span>
                  </Link>
                ) : (
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    <StepCircle isCompleted={false} isCurrent={false} stageKey={stage.key} />
                    <span className="hidden sm:block text-[11px] font-medium text-slate-300 text-center">
                      {stage.label}
                    </span>
                  </div>
                )}

                {i < STAGES.length - 1 && (
                  <div className="flex-1 mx-1 sm:mx-2 h-0.5 rounded-full">
                    <div className={`h-full rounded-full transition-all duration-500 ${isCompleted ? "bg-green-400" : "bg-slate-200"}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepCircle({ isCompleted, isCurrent, stageKey }: { isCompleted: boolean; isCurrent: boolean; stageKey: StageKey }) {
  const size = "w-8 h-8 sm:w-9 sm:h-9";

  if (isCompleted) {
    return (
      <div className={`${size} rounded-full bg-green-500 flex items-center justify-center shadow-sm shadow-green-200 transition-all`}>
        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={3} />
      </div>
    );
  }

  if (isCurrent) {
    return (
      <div className="relative flex items-center justify-center">
        <div className={`absolute ${size} rounded-full bg-[#1B6B7A]/20 animate-ping`} />
        <div className={`relative ${size} rounded-full bg-[#1B6B7A] flex items-center justify-center shadow-md shadow-teal-200 transition-all`}>
          <span className="text-white">{STAGE_ICONS[stageKey]}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${size} rounded-full bg-slate-100 flex items-center justify-center transition-all`}>
      <span className="text-slate-300">{STAGE_ICONS[stageKey]}</span>
    </div>
  );
}
