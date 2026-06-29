import { z } from "zod";

export const experienceEntrySchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  dates: z.string(),
  bullets: z.array(z.string()),
});

export const projectEntrySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  bullets: z.array(z.string()).optional(),
});

export const educationEntrySchema = z.object({
  degree: z.string().min(1),
  school: z.string().min(1),
  dates: z.string().optional(),
});

export const resumeContentSchema = z.object({
  experience: z.array(experienceEntrySchema),
  projects: z.array(projectEntrySchema),
  education: z.array(educationEntrySchema),
  skills: z.array(z.string()),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;

export const resumeTailorOutputSchema = z.object({
  tailored_content: resumeContentSchema,
});

export type ResumeTailorLLMOutput = z.infer<typeof resumeTailorOutputSchema>;

export const flaggedClaimSchema = z.object({
  claim: z.string().min(1),
  reason: z.string().min(1),
});

export const hallucinationCheckOutputSchema = z.object({
  flagged_claims: z.array(flaggedClaimSchema),
});

export type HallucinationCheckLLMOutput = z.infer<
  typeof hallucinationCheckOutputSchema
>;

export const createResumeRequestSchema = z.object({
  version_label: z.string().min(1, "Version label is required"),
  content_json: resumeContentSchema,
  is_base_resume: z.boolean().optional(),
});

export const updateResumeRequestSchema = z.object({
  version_label: z.string().min(1).optional(),
  content_json: resumeContentSchema.optional(),
});

export const resumeTailorRequestSchema = z.object({
  baseResumeId: z.string().uuid(),
  jobDescriptionText: z.string().min(1, "Job description is required"),
  applicationId: z.string().uuid().optional().nullable(),
  useFlashFallback: z.boolean().optional(),
  thinkingMode: z.boolean().optional(),
});

export const resumeTailorApproveRequestSchema = z.object({
  version_label: z.string().min(1, "Version label is required"),
  content_json: resumeContentSchema,
  applicationId: z.string().uuid().optional().nullable(),
  baseResumeId: z.string().uuid(),
});

export const emptyResumeContent = (): ResumeContent => ({
  experience: [],
  projects: [],
  education: [],
  skills: [],
});
