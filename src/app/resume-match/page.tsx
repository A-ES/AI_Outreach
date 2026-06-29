import { AppShell } from "@/components/layout/AppShell";
import { ResumeMatchView } from "@/components/resume-match/ResumeMatchView";

interface PageProps {
  searchParams: { applicationId?: string };
}

export default function ResumeMatchPage({ searchParams }: PageProps) {
  return (
    <AppShell>
      <ResumeMatchView initialApplicationId={searchParams.applicationId ?? null} />
    </AppShell>
  );
}
