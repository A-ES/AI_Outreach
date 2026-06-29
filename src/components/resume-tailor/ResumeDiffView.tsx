import type { FlaggedClaim } from "@/lib/types";
import type { ResumeDiffLine } from "@/lib/utils/resume-diff";

interface ResumeDiffViewProps {
  lines: ResumeDiffLine[];
  flaggedClaims?: FlaggedClaim[];
}

const kindStyles: Record<
  ResumeDiffLine["kind"],
  { base: string; tailored: string; label: string; labelClass: string }
> = {
  unchanged: {
    base: "bg-panel",
    tailored: "bg-panel",
    label: "Unchanged",
    labelClass: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100",
  },
  changed: {
    base: "bg-amber-50 text-amber-950 line-through decoration-amber-500 dark:bg-amber-950/30 dark:text-amber-100",
    tailored: "bg-amber-50 font-medium text-amber-950 dark:bg-amber-950/30 dark:text-amber-100",
    label: "Changed",
    labelClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100",
  },
  removed: {
    base: "bg-red-50 text-red-950 line-through decoration-red-500 dark:bg-red-950/30 dark:text-red-100",
    tailored: "bg-panel-subtle text-muted",
    label: "Removed",
    labelClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100",
  },
  added: {
    base: "bg-panel-subtle text-muted",
    tailored: "bg-emerald-50 font-medium text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100",
    label: "Added",
    labelClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100",
  },
};

export function ResumeDiffView({ lines, flaggedClaims = [] }: ResumeDiffViewProps) {
  const visible = lines.filter((l) => l.kind !== "unchanged");
  const flaggedText = flaggedClaims.map((claim) => claim.claim.toLowerCase());

  if (visible.length === 0) {
    return (
      <p className="caption rounded-card border border-border bg-panel-subtle px-4 py-3">
        No visible changes between base and tailored versions.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-border">
      <div className="grid grid-cols-2 border-b border-border bg-panel-subtle text-sm font-medium text-muted">
        <div className="px-4 py-2">Base resume</div>
        <div className="border-l border-border px-4 py-2">Tailored resume</div>
      </div>
      {visible.map((line, i) => {
        const styles = kindStyles[line.kind];
        const tailored = line.tailored ?? "";
        const flagged = flaggedText.some(
          (claim) => claim.length > 0 && tailored.toLowerCase().includes(claim)
        );
        return (
          <div
            key={i}
            className={`grid grid-cols-2 border-t border-border text-sm ${
              flagged ? "ring-2 ring-inset ring-red-400" : ""
            }`}
          >
            <div className={`px-4 py-2 ${styles.base}`}>
              {line.base ?? <span className="caption text-slate-400">—</span>}
            </div>
            <div className={`border-l border-border px-4 py-2 ${styles.tailored}`}>
              <div className="mb-1 flex items-center gap-2">
                <span className={`status-pill ${styles.labelClass}`}>{styles.label}</span>
                {flagged && (
                  <span className="status-pill bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100">
                    Flagged
                  </span>
                )}
              </div>
              {line.tailored ?? <span className="caption text-slate-400">—</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
