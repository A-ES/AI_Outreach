import type { ResumeMatchResult } from "@/lib/types";
import { formatDate } from "@/lib/utils/dates";
import { ConfidenceBadge } from "@/components/resume-match/ConfidenceBadge";
import { ReasoningTraceTable } from "@/components/resume-match/ReasoningTraceTable";

interface ResumeMatchResultViewProps {
  result: ResumeMatchResult;
}

export function ResumeMatchResultView({ result }: ResumeMatchResultViewProps) {
  return (
    <div className="card space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="caption">Match score</p>
          <p className="text-4xl font-semibold text-accent">
            {result.match_score}
            <span className="text-lg font-normal text-muted">/100</span>
          </p>
        </div>
        <div className="text-right">
          <ConfidenceBadge
            label={result.confidence_label}
            reason={result.confidence_reason}
          />
          <p className="caption mt-2">{formatDate(result.created_at.slice(0, 10))}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <KeywordList title="Matched keywords" keywords={result.matched_keywords} variant="matched" />
        <KeywordList title="Missing keywords" keywords={result.missing_keywords} variant="missing" />
      </div>

      <div>
        <h3 className="section-heading mb-3">Reasoning trace</h3>
        <ReasoningTraceTable entries={result.reasoning_trace} />
      </div>
    </div>
  );
}

function KeywordList({
  title,
  keywords,
  variant,
}: {
  title: string;
  keywords: string[];
  variant: "matched" | "missing";
}) {
  return (
    <div>
      <p className="caption mb-2 font-medium">{title}</p>
      {keywords.length === 0 ? (
        <p className="caption">None</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <span
              key={kw}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                variant === "matched"
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                  : "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-200"
              }`}
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
