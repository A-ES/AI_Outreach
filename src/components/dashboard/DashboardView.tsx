"use client";

import { useEffect, useState } from "react";
import type { DashboardStats } from "@/lib/types";
import { formatDate, getWeekStartDate } from "@/lib/utils/dates";
import { EmptyState } from "@/components/ui/EmptyState";

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekStartDate, setWeekStartDate] = useState(getWeekStartDate());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [targetApps, setTargetApps] = useState(5);
  const [targetInterviews, setTargetInterviews] = useState(2);
  const [savingGoals, setSavingGoals] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load dashboard");

      setStats(data);
      setWeekStartDate(data.weekStartDate);
      if (data.weeklyGoal) {
        setTargetApps(data.weeklyGoal.target_applications);
        setTargetInterviews(data.weeklyGoal.target_interviews);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function saveGoals(e: React.FormEvent) {
    e.preventDefault();
    setSavingGoals(true);
    try {
      const res = await fetch("/api/weekly-goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_start_date: weekStartDate,
          target_applications: targetApps,
          target_interviews: targetInterviews,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save goals");
      await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save goals");
    } finally {
      setSavingGoals(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <p className="body-text">Loading dashboard…</p>;
  }

  if (error && !stats) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const goal = stats?.weeklyGoal;
  const hasNoActivity =
    (stats?.totalApplications ?? 0) === 0 &&
    (stats?.totalInterviews ?? 0) === 0 &&
    (stats?.totalOffers ?? 0) === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="caption mt-1">
          Week of {formatDate(weekStartDate)}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total applications" value={stats?.totalApplications ?? 0} />
        <StatCard label="Interviews" value={stats?.totalInterviews ?? 0} />
        <StatCard label="Offers" value={stats?.totalOffers ?? 0} />
        <StatCard label="Follow-ups due" value={stats?.followUpsDue ?? 0} highlight={(stats?.followUpsDue ?? 0) > 0} />
      </div>

      {hasNoActivity && (
        <EmptyState
          title="Your workspace is ready"
          description="Add an application or contact to start building a pipeline. The dashboard will fill in as your search gains shape."
        />
      )}

      <section className="card">
        <h2 className="section-heading mb-4">Weekly goals</h2>
        <form onSubmit={saveGoals} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="caption mb-1 block font-medium">
                Target applications
              </label>
              <input
                type="number"
                min={0}
                value={targetApps}
                onChange={(e) => setTargetApps(Number(e.target.value))}
                className="input-field"
              />
              <p className="caption mt-1">
                Actual: {goal?.actual_applications ?? 0}
              </p>
              <ProgressBar
                actual={goal?.actual_applications ?? 0}
                target={targetApps}
              />
            </div>
            <div>
              <label className="caption mb-1 block font-medium">
                Target interviews
              </label>
              <input
                type="number"
                min={0}
                value={targetInterviews}
                onChange={(e) => setTargetInterviews(Number(e.target.value))}
                className="input-field"
              />
              <p className="caption mt-1">
                Actual: {goal?.actual_interviews ?? 0}
              </p>
              <ProgressBar
                actual={goal?.actual_interviews ?? 0}
                target={targetInterviews}
              />
            </div>
          </div>
          <button type="submit" disabled={savingGoals} className="btn-primary">
            {savingGoals ? "Saving…" : "Save weekly goals"}
          </button>
        </form>
      </section>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="card">
      <p className="caption">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${highlight ? "text-amber-600 dark:text-amber-400" : "text-accent"}`}>{value}</p>
    </div>
  );
}

function ProgressBar({ actual, target }: { actual: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel-subtle">
      <div
        className="h-full rounded-full bg-accent transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
