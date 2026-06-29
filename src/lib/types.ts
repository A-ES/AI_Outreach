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
