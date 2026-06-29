"use client";

import { useState } from "react";
import type { ResumeMatchResult } from "@/lib/types";
import { MatchResultsHistory } from "@/components/resume-match/MatchResultsHistory";
import { ResumeMatchResultView } from "@/components/resume-match/ResumeMatchResultView";

interface ApplicationMatchHistoryProps {
  applicationId: string;
}

export function ApplicationMatchHistory({
  applicationId,
}: ApplicationMatchHistoryProps) {
  const [selected, setSelected] = useState<ResumeMatchResult | null>(null);

  return (
    <div className="space-y-6">
      <MatchResultsHistory
        applicationId={applicationId}
        onSelectResult={setSelected}
      />
      {selected && <ResumeMatchResultView result={selected} />}
    </div>
  );
}
