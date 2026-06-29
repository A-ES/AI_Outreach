import { z } from "zod";

export const analyticsInsightSchema = z.object({
  observation: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  possible_reason: z.string().min(1),
  confidence: z.enum(["low", "medium", "high"]),
  sample_size_note: z.string().min(1),
});

export type AnalyticsInsight = z.infer<typeof analyticsInsightSchema>;
