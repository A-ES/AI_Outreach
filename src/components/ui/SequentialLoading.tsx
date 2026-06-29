"use client";

import { useEffect, useState } from "react";

interface SequentialLoadingProps {
  steps: string[];
}

export function SequentialLoading({ steps }: SequentialLoadingProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (steps.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => Math.min(current + 1, steps.length - 1));
    }, 900);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="rounded-card border border-border bg-panel-subtle px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{steps[index] ?? steps[0]}</p>
          <p className="caption mt-0.5">Working through the request step by step.</p>
        </div>
      </div>
    </div>
  );
}
