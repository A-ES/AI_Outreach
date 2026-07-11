import { z } from "zod";

export const ATS_CHECK_NAMES = [
  "text_extractability",
  "multi_column_layout",
  "section_headers_recognizable",
  "contact_info_location",
  "tables_or_textboxes",
  "special_characters",
] as const;

export const atsCheckItemSchema = z.object({
  check_name: z.enum(ATS_CHECK_NAMES),
  passed: z.boolean(),
  detail: z.string().min(1),
  suggested_fix: z.string().optional(),
  recommendation: z.string().optional(),
});

export const atsCheckResultSchema = z.object({
  overall_pass: z.boolean(),
  checks: z.array(atsCheckItemSchema),
  score: z.number().min(0).max(100).optional(),
});

export const atsHeaderCheckSchema = z.object({
  passed: z.boolean(),
  detail: z.string().min(1),
  suggested_fix: z.string(),
});

export type AtsCheckName = (typeof ATS_CHECK_NAMES)[number];
export type AtsCheckItem = z.infer<typeof atsCheckItemSchema>;
export type AtsCheckResult = z.infer<typeof atsCheckResultSchema>;
export type AtsHeaderCheckResult = z.infer<typeof atsHeaderCheckSchema>;
