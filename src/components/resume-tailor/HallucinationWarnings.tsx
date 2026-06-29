"use client";

import type { FlaggedClaim } from "@/lib/types";

interface HallucinationWarningsProps {
  claims: FlaggedClaim[];
}

export function HallucinationWarnings({ claims }: HallucinationWarningsProps) {
  if (claims.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        No hallucinated claims detected. Review the diff before approving.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm font-medium text-red-900">
        {claims.length} flagged claim{claims.length === 1 ? "" : "s"} — review before approving
      </p>
      <p className="caption mt-1 text-red-800">
        These items may not be supported by your base resume. You can still approve if you
        accept the risk.
      </p>
      <ul className="mt-3 space-y-3">
        {claims.map((item, i) => (
          <li key={i} className="rounded-md border border-red-200 bg-surface px-3 py-2 text-sm">
            <p className="font-medium text-red-900">&ldquo;{item.claim}&rdquo;</p>
            <p className="caption mt-1 text-red-700">{item.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
