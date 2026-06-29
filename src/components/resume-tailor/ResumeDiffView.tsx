import type { ResumeDiffLine } from "@/lib/utils/resume-diff";

interface ResumeDiffViewProps {
  lines: ResumeDiffLine[];
}

const kindStyles: Record<ResumeDiffLine["kind"], { base: string; tailored: string }> = {
  unchanged: { base: "bg-white", tailored: "bg-white" },
  changed: { base: "bg-amber-50 line-through decoration-amber-400", tailored: "bg-emerald-50 font-medium" },
  removed: { base: "bg-red-50 line-through", tailored: "bg-slate-50" },
  added: { base: "bg-slate-50", tailored: "bg-emerald-50 font-medium" },
};

export function ResumeDiffView({ lines }: ResumeDiffViewProps) {
  const visible = lines.filter((l) => l.kind !== "unchanged");

  if (visible.length === 0) {
    return (
      <p className="caption rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        No visible changes between base and tailored versions.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-sm font-medium text-slate-600">
        <div className="px-4 py-2">Base resume</div>
        <div className="border-l border-slate-200 px-4 py-2">Tailored resume</div>
      </div>
      {visible.map((line, i) => {
        const styles = kindStyles[line.kind];
        return (
          <div key={i} className="grid grid-cols-2 border-t border-slate-100 text-sm">
            <div className={`px-4 py-2 ${styles.base}`}>
              {line.base ?? <span className="caption text-slate-400">—</span>}
            </div>
            <div className={`border-l border-slate-100 px-4 py-2 ${styles.tailored}`}>
              {line.tailored ?? <span className="caption text-slate-400">—</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
