"use client";

import { useEffect, useState } from "react";
import type { ResumeMatchResult } from "@/lib/types";
import { formatDate } from "@/lib/utils/dates";

interface MatchResultsHistoryProps {
  applicationId: string;
  refreshKey?: number;
  onSelectResult?: (result: ResumeMatchResult) => void;
}

export function MatchResultsHistory({
  applicationId,
  refreshKey = 0,
  onSelectResult,
}: MatchResultsHistoryProps) {
  const [results, setResults] = useState<ResumeMatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/resume-match?applicationId=${encodeURIComponent(applicationId)}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load history");
        setResults(data.results);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [applicationId, refreshKey]);

  if (loading) return <p className="caption">Loading match history…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (results.length === 0) {
    return <p className="caption">No past match results for this application.</p>;
  }

  return (
    <div className="space-y-2">
      {results.map((result) => (
        <button
          key={result.id}
          type="button"
          onClick={() => onSelectResult?.(result)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm transition hover:border-indigo-200 hover:bg-indigo-50/50"
        >
          <span>
            <span className="font-medium text-indigo-700">{result.match_score}/100</span>
            <span className="caption ml-2 capitalize">{result.confidence_label} confidence</span>
          </span>
          <span className="caption">{formatDate(result.created_at.slice(0, 10))}</span>
        </button>
      ))}
    </div>
  );
}
