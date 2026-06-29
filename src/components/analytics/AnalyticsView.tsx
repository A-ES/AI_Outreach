"use client";

import { useEffect, useState } from "react";
import type {
  AnalyticsApiResponse,
  AnalyticsRateBucket,
  AnalyticsResult,
  OutcomeAnalyticsStats,
} from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { SequentialLoading } from "@/components/ui/SequentialLoading";

export function AnalyticsView() {
  const [stats, setStats] = useState<OutcomeAnalyticsStats | null>(null);
  const [insight, setInsight] = useState<AnalyticsResult | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [requiredCount, setRequiredCount] = useState(15);
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
        setInsight(data.insight);
        setInsightError(data.insight_error);
        setRequiredCount(data.required_count);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <SequentialLoading
        steps={[
          "Collecting logged outcomes...",
          "Computing reply-rate breakdowns...",
          "Checking whether there is enough data...",
          "Preparing evidence-backed insights...",
        ]}
      />
    );
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

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Reply Rate Over Time" buckets={stats.reply_rate_over_time} />
        <ChartCard title="By Resume Version" buckets={stats.by_resume_version} />
        <ChartCard title="By Day Sent" buckets={stats.by_day_sent} />
        <ChartCard title="By Email Length" buckets={stats.by_email_length} />
      </section>

      {stats.logged_outcome_count === 0 && (
        <EmptyState
          title="No outcome data logged yet"
          description="Charts will populate after sent outreach gets outcomes. AI hypotheses stay locked until there are enough logged outcomes."
        />
      )}

      {insight && "insufficient_data" in insight ? (
        <section className="card border-amber-200 bg-amber-50">
          <h2 className="section-heading text-amber-950">Not enough data yet</h2>
          <p className="body-text mt-2 text-amber-900">
            You have {insight.current_count} logged outcomes. Log{" "}
            {Math.max(0, insight.required_count - insight.current_count)} more to unlock
            AI-generated hypotheses.
          </p>
          <ProgressBar current={insight.current_count} required={requiredCount} />
        </section>
      ) : insight ? (
        <section className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-heading">Hypothesis</h2>
              <p className="caption mt-1">{insight.sample_size_note}</p>
            </div>
            <span className={confidenceClassName(insight.confidence)}>
              {insight.confidence} confidence
            </span>
          </div>
          <p className="mt-4 text-base font-medium text-foreground">
            {insight.observation}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-foreground">Evidence</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/80">
                {insight.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Possible Reason</h3>
              <p className="mt-2 text-sm text-foreground/80">{insight.possible_reason}</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="card border-red-200 bg-red-50">
          <h2 className="section-heading text-red-950">Hypothesis unavailable</h2>
          <p className="body-text mt-2 text-red-900">
            Charts are available, but the AI hypothesis could not be generated.
            {insightError ? ` ${insightError}` : ""}
          </p>
        </section>
      )}
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

function ChartCard({
  title,
  buckets,
}: {
  title: string;
  buckets: AnalyticsRateBucket[];
}) {
  const maxRate = Math.max(1, ...buckets.map((bucket) => bucket.reply_rate));

  return (
    <div className="card">
      <h2 className="section-heading">{title}</h2>
      <div className="mt-4 space-y-3">
        {buckets.length === 0 ? (
          <p className="caption">No logged outcomes yet.</p>
        ) : (
          buckets.map((bucket) => (
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
                  style={{ width: `${Math.max(2, (bucket.reply_rate / maxRate) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ProgressBar({ current, required }: { current: number; required: number }) {
  const pct = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 0;
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-xs font-medium text-amber-900">
        <span>{current} logged</span>
        <span>{required} required</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-amber-100">
        <div className="h-full rounded-full bg-amber-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function confidenceClassName(confidence: "low" | "medium" | "high") {
  const base = "rounded-full px-3 py-1 text-xs font-semibold capitalize";
  if (confidence === "high") return `${base} bg-emerald-100 text-emerald-800`;
  if (confidence === "medium") return `${base} bg-amber-100 text-amber-800`;
  return `${base} bg-panel-subtle text-muted`;
}
