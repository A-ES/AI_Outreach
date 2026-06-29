export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const CONTACT_STATUSES = [
  "not_contacted",
  "drafted",
  "sent",
  "replied",
  "no_response",
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  role_title: string;
  job_description_text: string | null;
  status: ApplicationStatus;
  date_applied: string | null;
  date_status_changed: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  application_id: string | null;
  name: string;
  company_name: string | null;
  role_title: string | null;
  email: string | null;
  linkedin_url: string | null;
  status: ContactStatus;
  created_at: string;
  updated_at: string;
}

export interface ContactWithApplication extends Contact {
  applications?: { company_name: string; role_title: string } | null;
}

export interface WeeklyGoal {
  id: string;
  user_id: string;
  week_start_date: string;
  target_applications: number;
  target_interviews: number;
  actual_applications: number;
  actual_interviews: number;
}

export interface DashboardStats {
  totalApplications: number;
  totalInterviews: number;
  totalOffers: number;
  weeklyGoal: WeeklyGoal | null;
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  not_contacted: "Not contacted",
  drafted: "Drafted",
  sent: "Sent",
  replied: "Replied",
  no_response: "No response",
};

export const KANBAN_COLUMNS: ApplicationStatus[] = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
];

export type ConfidenceLabel = "high" | "medium" | "low";

export interface ReasoningTraceEntry {
  requirement: string;
  matched_resume_line: string;
  matched: boolean;
}

export interface ResumeMatchResult {
  id: string;
  user_id: string;
  application_id: string | null;
  resume_id: string | null;
  match_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  reasoning_trace: ReasoningTraceEntry[];
  confidence_label: ConfidenceLabel;
  confidence_reason: string;
  created_at: string;
}

export const CONFIDENCE_LABELS: Record<
  ConfidenceLabel,
  { label: string; className: string }
> = {
  high: { label: "High confidence", className: "bg-emerald-100 text-emerald-800" },
  medium: { label: "Medium confidence", className: "bg-amber-100 text-amber-800" },
  low: { label: "Low confidence", className: "bg-red-100 text-red-800" },
};

export interface Resume {
  id: string;
  user_id: string;
  version_label: string;
  content_json: import("@/lib/validation/resume").ResumeContent;
  is_base_resume: boolean;
  tailored_for_application_id: string | null;
  created_at: string;
}

export interface FlaggedClaim {
  claim: string;
  reason: string;
}

export type OutreachEmailStatus = "draft" | "approved" | "sent" | "rejected";

export type OutreachOutcome =
  | "no_reply"
  | "positive"
  | "rejection"
  | "interview_request";

export interface OutreachEmail {
  id: string;
  user_id: string;
  contact_id: string;
  application_id: string | null;
  subject: string;
  body: string;
  status: OutreachEmailStatus;
  date_drafted: string;
  date_sent: string | null;
  reply_received: boolean;
  outcome: OutreachOutcome | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachEmailWithContact extends OutreachEmail {
  contacts?: {
    name: string;
    email: string | null;
    company_name: string | null;
    role_title: string | null;
  } | null;
}

export const OUTREACH_STATUS_LABELS: Record<OutreachEmailStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  sent: "Sent",
  rejected: "Rejected",
};

export const OUTREACH_OUTCOME_LABELS: Record<OutreachOutcome, string> = {
  no_reply: "No reply",
  positive: "Positive",
  rejection: "Rejection",
  interview_request: "Interview request",
};

export type AnalyticsEmailLengthBucket =
  | "Short (<100 words)"
  | "Medium (100-180 words)"
  | "Long (181+ words)";

export interface AnalyticsRateBucket {
  label: string;
  sent_count: number;
  reply_count: number;
  reply_rate: number;
}

export interface OutcomeAnalyticsStats {
  logged_outcome_count: number;
  sent_count: number;
  reply_count: number;
  overall_reply_rate: number;
  by_resume_version: AnalyticsRateBucket[];
  by_day_sent: AnalyticsRateBucket[];
  by_email_length: AnalyticsRateBucket[];
  reply_rate_over_time: AnalyticsRateBucket[];
}

export interface InsightResult {
  observation: string;
  evidence: string[];
  possible_reason: string;
  confidence: "low" | "medium" | "high";
  sample_size_note: string;
}

export interface InsufficientDataResult {
  insufficient_data: true;
  current_count: number;
  required_count: number;
}

export type AnalyticsResult = InsightResult | InsufficientDataResult;

export interface AnalyticsApiResponse {
  stats: OutcomeAnalyticsStats;
  insight: AnalyticsResult | null;
  insight_error: string | null;
  required_count: number;
}

export interface EvalTestCase {
  id: string;
  job_description_text: string;
  expected_keywords: string[];
  expected_missing_skills: string[];
  expected_match_range_min: number;
  expected_match_range_max: number;
  created_at: string;
}

export interface EvalRunResult {
  id: string;
  eval_test_case_id: string;
  run_timestamp: string;
  actual_match_score: number;
  keyword_precision: number;
  keyword_recall: number;
  passed: boolean;
  notes: string | null;
}

export interface AiEvaluationMetrics {
  latest_run_timestamp: string | null;
  eval_case_count: number;
  resume_match_accuracy: number;
  average_keyword_precision: number;
  average_keyword_recall: number;
  tailoring_hallucinations_detected: number;
  average_generation_time_ms: number;
  average_cost_per_request: number;
  average_confidence_score: number | null;
  total_eval_runs: number;
}
