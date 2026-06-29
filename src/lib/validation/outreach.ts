import { z } from "zod";

export const OUTREACH_EMAIL_STATUSES = [
  "draft",
  "approved",
  "sent",
  "rejected",
] as const;

export type OutreachEmailStatus = (typeof OUTREACH_EMAIL_STATUSES)[number];

export const OUTREACH_OUTCOMES = [
  "no_reply",
  "positive",
  "rejection",
  "interview_request",
] as const;

export type OutreachOutcome = (typeof OUTREACH_OUTCOMES)[number];

export const outreachDraftOutputSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

export type OutreachDraftLLMOutput = z.infer<typeof outreachDraftOutputSchema>;

export const outreachGenerateRequestSchema = z.object({
  contactId: z.string().uuid(),
  regenerationNote: z.string().optional(),
});

export const outreachUpdateDraftSchema = z.object({
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
});

export const outreachRegenerateRequestSchema = z.object({
  note: z.string().min(1, "Regeneration note is required"),
});

export const outreachOutcomeSchema = z.object({
  reply_received: z.boolean().optional(),
  outcome: z.enum(OUTREACH_OUTCOMES).optional().nullable(),
});

/** Enforced state machine — send is only valid from approved. */
export const OUTREACH_STATUS_TRANSITIONS: Record<
  OutreachEmailStatus,
  OutreachEmailStatus[]
> = {
  draft: ["approved", "rejected"],
  approved: ["sent"],
  sent: [],
  rejected: ["draft"],
};

export function canTransition(
  from: OutreachEmailStatus,
  to: OutreachEmailStatus
): boolean {
  return OUTREACH_STATUS_TRANSITIONS[from].includes(to);
}

export function assertCanSend(status: OutreachEmailStatus): void {
  if (status !== "approved") {
    throw new Error(
      `Send is not allowed: draft must be in "approved" status (current: "${status}")`
    );
  }
}

export function assertCanEdit(status: OutreachEmailStatus): void {
  if (status !== "draft") {
    throw new Error(`Only drafts in "draft" status can be edited (current: "${status}")`);
  }
}

export function assertCanRegenerate(status: OutreachEmailStatus): void {
  if (status !== "draft" && status !== "rejected") {
    throw new Error(
      `Regeneration is only allowed for draft or rejected emails (current: "${status}")`
    );
  }
}
