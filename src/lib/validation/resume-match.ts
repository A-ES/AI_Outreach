import { z } from "zod";

export const reasoningTraceEntrySchema = z.object({
  requirement: z.string().min(1),
  matched_resume_line: z.string(),
  matched: z.boolean(),
});

export const resumeMatchOutputSchema = z
  .object({
    match_score: z.number().int().min(0).max(100),
    matched_keywords: z.array(z.string()),
    missing_keywords: z.array(z.string()),
    reasoning_trace: z.array(reasoningTraceEntrySchema),
    confidence_label: z.enum(["high", "medium", "low"]),
    confidence_reason: z.string(),
  })
  .refine(
    (data) =>
      data.confidence_label === "high" ||
      data.confidence_reason.trim().length > 0,
    {
      message:
        "confidence_reason must be non-empty when confidence_label is medium or low",
      path: ["confidence_reason"],
    }
  );

export type ResumeMatchLLMOutput = z.infer<typeof resumeMatchOutputSchema>;
export type ReasoningTraceEntry = z.infer<typeof reasoningTraceEntrySchema>;

export const resumeMatchAnalyzeRequestSchema = z
  .object({
    jobDescriptionText: z.string().min(1, "Job description is required"),
    resumeText: z.string().optional(),
    applicationId: z.string().uuid().optional().nullable(),
    resumeId: z.string().uuid().optional().nullable(),
  })
  .refine((data) => data.resumeId || (data.resumeText && data.resumeText.length > 0), {
    message: "Either resumeId or resumeText is required",
  });

export type ResumeMatchAnalyzeRequest = z.infer<
  typeof resumeMatchAnalyzeRequestSchema
>;
