import type { ReasoningTraceEntry } from "@/lib/types";

interface ReasoningTraceTableProps {
  entries: ReasoningTraceEntry[];
}

export function ReasoningTraceTable({ entries }: ReasoningTraceTableProps) {
  if (entries.length === 0) {
    return <p className="caption">No reasoning trace entries.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr className="text-slate-500">
            <th className="px-4 py-3 font-medium">Requirement</th>
            <th className="px-4 py-3 font-medium">Resume evidence</th>
            <th className="px-4 py-3 font-medium">Matched</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="px-4 py-3 align-top text-slate-800">
                {entry.requirement}
              </td>
              <td className="px-4 py-3 align-top text-slate-600">
                {entry.matched_resume_line || "—"}
              </td>
              <td className="px-4 py-3 align-top">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    entry.matched
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
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
