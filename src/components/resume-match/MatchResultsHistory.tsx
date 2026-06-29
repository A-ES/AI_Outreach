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
    return (
      <div className="empty-state py-6">
        <h3 className="text-sm font-semibold text-foreground">No saved match results</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Run a match analysis for this application and the history will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((result) => (
        <button
          key={result.id}
          type="button"
          onClick={() => onSelectResult?.(result)}
          className="flex w-full items-center justify-between rounded-card border border-border bg-surface px-4 py-3 text-left text-sm transition hover:border-accent hover:bg-accent-soft"
        >
          <span>
            <span className="font-medium text-accent">{result.match_score}/100</span>
            <span className="caption ml-2 capitalize">{result.confidence_label} confidence</span>
          </span>
          <span className="caption">{formatDate(result.created_at.slice(0, 10))}</span>
        </button>
      ))}
    </div>
  );
}
