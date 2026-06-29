import { AppShell } from "@/components/layout/AppShell";
import { ResumeTailorView } from "@/components/resume-tailor/ResumeTailorView";

interface PageProps {
  searchParams: { applicationId?: string };
}

export default function ResumeTailorPage({ searchParams }: PageProps) {
  return (
    <AppShell>
      <ResumeTailorView initialApplicationId={searchParams.applicationId ?? null} />
    </AppShell>
  );
}
