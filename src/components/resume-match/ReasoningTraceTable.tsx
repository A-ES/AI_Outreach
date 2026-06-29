import type { ReasoningTraceEntry } from "@/lib/types";

interface ReasoningTraceTableProps {
  entries: ReasoningTraceEntry[];
}

export function ReasoningTraceTable({ entries }: ReasoningTraceTableProps) {
  if (entries.length === 0) {
    return <p className="caption">No reasoning trace entries.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-panel-subtle">
          <tr className="text-muted">
            <th className="px-4 py-3 font-medium">Requirement</th>
            <th className="px-4 py-3 font-medium">Resume evidence</th>
            <th className="px-4 py-3 font-medium">Matched</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-4 py-3 align-top text-foreground">
                {entry.requirement}
              </td>
              <td className="px-4 py-3 align-top text-muted">
                {entry.matched_resume_line || "—"}
              </td>
              <td className="px-4 py-3 align-top">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    entry.matched
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-panel-subtle text-muted"
                  }`}
                >
                  {entry.matched ? "Yes" : "No"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
