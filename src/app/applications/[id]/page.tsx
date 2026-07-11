import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ApplicationMatchHistory } from "@/components/resume-match/ApplicationMatchHistory";
import { getDb } from "@/lib/db/sqlite";
import { getApplication } from "@/lib/db/applications";
import { STATUS_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/utils/dates";

interface PageProps {
  params: { id: string };
}

export default function ApplicationDetailPage({ params }: PageProps) {
  const db = getDb();
  const application = getApplication(db, "local", params.id);
  if (!application) notFound();

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/applications"
              className="caption text-accent hover:underline"
            >
              ← Applications
            </Link>
            <h1 className="page-title mt-2">{application.company_name}</h1>
            <p className="body-text">{application.role_title}</p>
            <p className="caption mt-1">
              {STATUS_LABELS[application.status]}
              {application.date_applied &&
                ` · Applied ${formatDate(application.date_applied)}`}
            </p>
          </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/resume-tailor?applicationId=${application.id}`}
            className="btn-primary"
          >
            Tailor resume
          </Link>
          <Link
            href={`/resume-match?applicationId=${application.id}`}
            className="btn-secondary"
          >
            Run resume match
          </Link>
        </div>
        </div>

        {application.job_description_text && (
          <section className="card">
            <h2 className="section-heading mb-2">Job description</h2>
            <pre className="body-text whitespace-pre-wrap font-sans">
              {application.job_description_text}
            </pre>
          </section>
        )}

        <section className="card">
          <h2 className="section-heading mb-4">Resume match history</h2>
          <ApplicationMatchHistory applicationId={application.id} />
        </section>
      </div>
    </AppShell>
  );
}
