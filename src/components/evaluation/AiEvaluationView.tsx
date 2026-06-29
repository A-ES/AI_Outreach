"use client";

import { useEffect, useState } from "react";
import type { AiEvaluationMetrics } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

export function AiEvaluationView() {
  const [metrics, setMetrics] = useState<AiEvaluationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ai-evaluation");
        const data = (await res.json()) as {
          metrics?: AiEvaluationMetrics;
          error?: string;
        };
        if (!res.ok || !data.metrics) {
          throw new Error(data.error ?? "Failed to load AI evaluation metrics");
        }
        setMetrics(data.metrics);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load AI evaluation");
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  if (loading) return <p className="body-text">Loading AI evaluation…</p>;
  if (error || !metrics) {
    return <p className="text-sm text-red-600">{error ?? "Metrics unavailable"}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">AI Evaluation</h1>
        <p className="caption mt-1">
          Model quality metrics from stored eval runs and AI call logs
        </p>
      </div>

      {metrics.eval_case_count === 0 && (
        <EmptyState
          title="No evaluation run recorded yet"
          description="Apply the eval migration and run the resume-match eval suite to populate comparable model-quality metrics."
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Resume Match Accuracy"
          value={`${formatPercent(metrics.resume_match_accuracy)}%`}
        />
        <MetricCard
          label="Keyword Precision"
          value={`${formatPercent(metrics.average_keyword_precision * 100)}%`}
        />
        <MetricCard
          label="Keyword Recall"
          value={`${formatPercent(metrics.average_keyword_recall * 100)}%`}
        />
        <MetricCard
          label="Hallucinations Detected"
          value={metrics.tailoring_hallucinations_detected}
        />
        <MetricCard
          label="Avg Generation Time"
          value={`${Math.round(metrics.average_generation_time_ms)} ms`}
        />
        <MetricCard
          label="Avg Cost / Request"
          value={`$${metrics.average_cost_per_request.toFixed(6)}`}
        />
        <MetricCard
          label="Avg Confidence Score"
          value={
            metrics.average_confidence_score === null
              ? "N/A"
              : metrics.average_confidence_score.toFixed(2)
          }
        />
        <MetricCard label="Comparable Runs" value={metrics.total_eval_runs} />
      </div>

      <section className="card">
        <h2 className="section-heading">Latest Eval Run</h2>
        <div className="mt-3 grid gap-3 text-sm text-foreground/80 sm:grid-cols-3">
          <p>
            <span className="font-medium text-foreground">Timestamp:</span>{" "}
            {metrics.latest_run_timestamp
              ? new Date(metrics.latest_run_timestamp).toLocaleString()
              : "No runs yet"}
          </p>
          <p>
            <span className="font-medium text-foreground">Cases:</span>{" "}
            {metrics.eval_case_count}
          </p>
          <p>
            <span className="font-medium text-foreground">Source:</span> eval tables
            and ai_call_logs
          </p>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card">
      <p className="caption">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-accent">{value}</p>
    </div>
  );
}

function formatPercent(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}
