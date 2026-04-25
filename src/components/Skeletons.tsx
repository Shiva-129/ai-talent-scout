const ROW_WIDTHS = [
  [100, 80, 60, 16, 10, 20, 8],
  [130, 95, 75, 16, 10, 24, 8],
  [110, 70, 65, 16, 10, 18, 8],
  [120, 85, 55, 16, 10, 22, 8],
  [105, 90, 70, 16, 10, 20, 8],
];

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 bg-slate-50 border-b border-slate-100">
        {[40, 120, 100, 80, 90, 60, 80, 50].map((w, i) => (
          <div key={i} className="h-3 bg-slate-200 rounded animate-pulse" style={{ width: w }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => {
        const widths = ROW_WIDTHS[i % ROW_WIDTHS.length];
        return (
          <div key={i} className={`flex items-center gap-4 px-4 py-4 ${i % 2 ? "bg-slate-50/30" : ""}`}>
            <div className="w-4 h-4 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 bg-slate-200 rounded animate-pulse" style={{ width: widths[0] }} />
            <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: widths[1] }} />
            <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: widths[2] }} />
            <div className="w-16 h-1.5 bg-slate-100 rounded-full animate-pulse" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-10" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-20" />
            <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse" />
          </div>
        );
      })}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-5 animate-pulse">
      <div className="flex items-center gap-5">
        <div className="w-24 h-24 rounded-full bg-slate-100" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-1/4" />
          <div className="h-3 bg-slate-100 rounded w-2/3 mt-2" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 bg-slate-100 rounded-full w-24" />
        <div className="h-6 bg-slate-100 rounded-full w-20" />
        <div className="h-6 bg-slate-100 rounded-full w-28" />
      </div>
    </div>
  );
}

export function FieldsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-100 rounded-xl p-5 animate-pulse">
          <div className="h-2.5 bg-slate-200 rounded w-1/3 mb-3" />
          <div className="h-4 bg-slate-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function OverlayLoader({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1B6B7A] rounded-full animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-700 text-center">{message}</p>
      </div>
    </div>
  );
}
