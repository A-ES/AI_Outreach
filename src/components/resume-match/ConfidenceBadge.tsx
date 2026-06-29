"use client";

import { useState } from "react";
import type { ConfidenceLabel } from "@/lib/types";
import { CONFIDENCE_LABELS } from "@/lib/types";

interface ConfidenceBadgeProps {
  label: ConfidenceLabel;
  reason: string;
}

export function ConfidenceBadge({ label, reason }: ConfidenceBadgeProps) {
  const [open, setOpen] = useState(false);
  const config = CONFIDENCE_LABELS[label];

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
        title={reason}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${config.label}. Click for reason.`}
      >
        {config.label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-2 w-72 rounded-card border border-border bg-panel p-3 text-sm text-foreground shadow-lg dark:shadow-none">
          <p className="caption mb-1 font-medium">Why this confidence level</p>
          <p>{reason || "No reason provided."}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="caption mt-2 text-accent hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </span>
  );
}
