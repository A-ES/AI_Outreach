import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AnalyticsEmailLengthBucket,
  AnalyticsRateBucket,
  OutcomeAnalyticsStats,
  OutreachEmail,
  Resume,
} from "@/lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const EMAIL_LENGTH_BUCKETS: Array<{
  label: AnalyticsEmailLengthBucket;
  min: number;
  max: number;
}> = [
  { label: "Short (<100 words)", min: 0, max: 99 },
  { label: "Medium (100-180 words)", min: 100, max: 180 },
  { label: "Long (181+ words)", min: 181, max: Number.POSITIVE_INFINITY },
];

type SentOutcomeRow = Pick<
  OutreachEmail,
  "id" | "application_id" | "body" | "date_sent" | "reply_received" | "outcome"
>;

function emptyRateBucket(label: string): AnalyticsRateBucket {
  return { label, sent_count: 0, reply_count: 0, reply_rate: 0 };
}

function toReplyRate(sentCount: number, replyCount: number): number {
  if (sentCount === 0) return 0;
  return Math.round((replyCount / sentCount) * 1000) / 10;
}

function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function addToBucket(bucket: AnalyticsRateBucket, replied: boolean) {
  bucket.sent_count += 1;
  if (replied) bucket.reply_count += 1;
  bucket.reply_rate = toReplyRate(bucket.sent_count, bucket.reply_count);
}

function bucketByEmailLength(body: string): AnalyticsEmailLengthBucket {
  const count = wordCount(body);
  return (
    EMAIL_LENGTH_BUCKETS.find((bucket) => count >= bucket.min && count <= bucket.max)
      ?.label ?? "Long (181+ words)"
  );
}

export async function getOutcomeAnalyticsStats(
  supabase: SupabaseClient,
  userId: string
): Promise<OutcomeAnalyticsStats> {
  const { data: outcomes, error: outcomesError } = await supabase
    .from("outreach_emails")
    .select("id, application_id, body, date_sent, reply_received, outcome")
    .eq("user_id", userId)
    .eq("status", "sent")
    .not("outcome", "is", null)
    .order("date_sent", { ascending: true });

  if (outcomesError) throw new Error(outcomesError.message);

  const { data: resumes, error: resumesError } = await supabase
    .from("resumes")
    .select("id, version_label, is_base_resume, tailored_for_application_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (resumesError) throw new Error(resumesError.message);

  const rows = (outcomes ?? []) as SentOutcomeRow[];
  const resumeRows = (resumes ?? []) as Array<
    Pick<
      Resume,
      "id" | "version_label" | "is_base_resume" | "tailored_for_application_id" | "created_at"
    >
  >;

  const latestResumeByApplication = new Map<string, string>();
  for (const resume of resumeRows) {
    if (resume.tailored_for_application_id && !latestResumeByApplication.has(resume.tailored_for_application_id)) {
      latestResumeByApplication.set(
        resume.tailored_for_application_id,
        resume.version_label
      );
    }
  }

  const baseResume = resumeRows.find((resume) => resume.is_base_resume);
  const fallbackResumeLabel = baseResume?.version_label ?? "Base/unknown";

  const byResumeVersion = new Map<string, AnalyticsRateBucket>();
  const byDaySent = new Map<string, AnalyticsRateBucket>(
    DAYS.map((day) => [day, emptyRateBucket(day)])
  );
  const byEmailLength = new Map<string, AnalyticsRateBucket>(
    EMAIL_LENGTH_BUCKETS.map((bucket) => [bucket.label, emptyRateBucket(bucket.label)])
  );
  const byWeek = new Map<string, AnalyticsRateBucket>();

  let replyCount = 0;

  for (const row of rows) {
    const replied = row.reply_received === true;
    if (replied) replyCount += 1;

    const resumeLabel = row.application_id
      ? latestResumeByApplication.get(row.application_id) ?? fallbackResumeLabel
      : fallbackResumeLabel;
    if (!byResumeVersion.has(resumeLabel)) {
      byResumeVersion.set(resumeLabel, emptyRateBucket(resumeLabel));
    }
    addToBucket(byResumeVersion.get(resumeLabel)!, replied);

    if (row.date_sent) {
      const sentDate = new Date(row.date_sent);
      const dayLabel = DAYS[sentDate.getDay()];
      addToBucket(byDaySent.get(dayLabel)!, replied);

      const weekStart = new Date(sentDate);
      weekStart.setDate(sentDate.getDate() - sentDate.getDay());
      const weekLabel = weekStart.toISOString().slice(0, 10);
      if (!byWeek.has(weekLabel)) byWeek.set(weekLabel, emptyRateBucket(weekLabel));
      addToBucket(byWeek.get(weekLabel)!, replied);
    }

    addToBucket(byEmailLength.get(bucketByEmailLength(row.body))!, replied);
  }

  return {
    logged_outcome_count: rows.length,
    sent_count: rows.length,
    reply_count: replyCount,
    overall_reply_rate: toReplyRate(rows.length, replyCount),
    by_resume_version: Array.from(byResumeVersion.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    ),
    by_day_sent: Array.from(byDaySent.values()),
    by_email_length: Array.from(byEmailLength.values()),
    reply_rate_over_time: Array.from(byWeek.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    ),
  };
}
