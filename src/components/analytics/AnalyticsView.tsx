"use client";

import { useEffect, useState } from "react";
import type {
  AnalyticsApiResponse,
  OutcomeAnalyticsStats,
} from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

export function AnalyticsView() {
  const [stats, setStats] = useState<OutcomeAnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analytics");
        const data = (await res.json()) as AnalyticsApiResponse & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load analytics");
        setStats(data.stats);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return <p className="body-text">Loading analytics…</p>;
  }
  if (error || !stats) {
    return <p className="text-sm text-red-600">{error ?? "Analytics unavailable"}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Outcome Analytics</h1>
        <p className="caption mt-1">
          Reply patterns from your logged outreach outcomes
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Logged outcomes" value={stats.logged_outcome_count} />
        <MetricCard label="Replies" value={stats.reply_count} />
        <MetricCard label="Overall reply rate" value={`${stats.overall_reply_rate}%`} />
      </div>

      {stats.logged_outcome_count === 0 ? (
        <EmptyState
          title="No outcome data logged yet"
          description="Charts will populate after sent outreach gets outcomes logged."
        />
      ) : stats.reply_rate_over_time.length > 0 ? (
        <section className="card">
          <h2 className="section-heading">Reply Rate Over Time</h2>
          <div className="mt-4 space-y-3">
            {stats.reply_rate_over_time.map((bucket) => (
              <div key={bucket.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-foreground">{bucket.label}</span>
                  <span className="shrink-0 text-muted">
                    {bucket.reply_rate}% · {bucket.reply_count}/{bucket.sent_count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-panel-subtle">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${Math.max(2, (bucket.reply_rate / Math.max(1, ...stats.reply_rate_over_time.map((b) => b.reply_rate))) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card">
      <p className="caption">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-accent">{value}</p>
    </div>
  );
}
