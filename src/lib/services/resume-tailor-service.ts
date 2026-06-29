import type { SupabaseClient } from "@supabase/supabase-js";
import { getResume } from "@/lib/db/resumes";
import { createLLMClient } from "@/lib/llm/client";
import { DEEPSEEK_MODELS } from "@/lib/llm/types";
import { loadPromptTemplate } from "@/lib/llm/prompt-loader";
import type { FlaggedClaim } from "@/lib/types";
import type { ResumeContent } from "@/lib/validation/resume";
import {
  hallucinationCheckOutputSchema,
  resumeTailorOutputSchema,
} from "@/lib/validation/resume";

const TAILOR_FEATURE = "resume_tailor";
const HALLUCINATION_FEATURE = "hallucination_check";

export interface TailorSuccess {
  status: "success";
  baseResumeId: string;
  baseContent: ResumeContent;
  tailoredContent: ResumeContent;
  flaggedClaims: FlaggedClaim[];
  tailorLogId: string;
  hallucinationLogId: string;
  modelUsed: string;
  thinkingMode: boolean;
  tailorLatencyMs: number;
  hallucinationLatencyMs: number;
}

export interface TailorNeedsReview {
  status: "needs_review";
  step: "tailor" | "hallucination_check";
  validationErrors: string[];
  logId: string;
}

export type TailorResult = TailorSuccess | TailorNeedsReview;

interface ResumeTailorServiceDeps {
  supabase: SupabaseClient;
  userId: string;
  applicationId?: string | null;
  useFlashFallback?: boolean;
  thinkingMode?: boolean;
}

function getTailorConfig(deps: ResumeTailorServiceDeps) {
  const thinkingMode =
    deps.thinkingMode ??
    process.env.RESUME_TAILOR_THINKING_MODE === "true";

  const defaultModel =
    process.env.RESUME_TAILOR_MODEL ?? DEEPSEEK_MODELS.PRO;
  const fallbackModel =
    process.env.RESUME_TAILOR_FALLBACK_MODEL ?? DEEPSEEK_MODELS.FLASH;

  const model = deps.useFlashFallback ? fallbackModel : defaultModel;

  return { model, thinkingMode };
}

export class ResumeTailorService {
  private supabase: SupabaseClient;
  private userId: string;
  private applicationId: string | null;
  private useFlashFallback: boolean;
  private thinkingMode: boolean;

  constructor(deps: ResumeTailorServiceDeps) {
    this.supabase = deps.supabase;
    this.userId = deps.userId;
    this.applicationId = deps.applicationId ?? null;
    this.useFlashFallback = deps.useFlashFallback ?? false;
    this.thinkingMode = deps.thinkingMode ?? false;
  }

  /**
   * Generate a tailored resume draft and run hallucination check.
   * Does NOT persist — caller must approve explicitly to save.
   */
  async tailor(
    baseResumeId: string,
    jobDescriptionText: string
  ): Promise<TailorResult> {
    const baseResume = await getResume(this.supabase, this.userId, baseResumeId);
    if (!baseResume) throw new Error("Base resume not found");

    if (!jobDescriptionText.trim()) {
      throw new Error("Job description text is required");
    }

    const baseContent = baseResume.content_json;
    const baseJson = JSON.stringify(baseContent, null, 2);
    const { model, thinkingMode } = getTailorConfig({
      supabase: this.supabase,
      userId: this.userId,
      useFlashFallback: this.useFlashFallback,
      thinkingMode: this.thinkingMode,
    });

    const llmClient = createLLMClient(this.supabase);

    const tailorPrompt = loadPromptTemplate("resume_tailor.md", {
      job_description: jobDescriptionText.trim(),
      base_resume_json: baseJson,
    });

    const tailorResult = await llmClient.generate({
      prompt: tailorPrompt,
      schema: resumeTailorOutputSchema,
      featureName: TAILOR_FEATURE,
      userId: this.userId,
      model,
      thinkingMode,
      temperature: 0.3,
    });

    if (tailorResult.status === "needs_review") {
      return {
        status: "needs_review",
        step: "tailor",
        validationErrors: tailorResult.validationErrors,
        logId: tailorResult.logId,
      };
    }

    const tailoredContent = tailorResult.content.tailored_content;
    const tailoredJson = JSON.stringify(tailoredContent, null, 2);

    const hallucinationPrompt = loadPromptTemplate("hallucination_check.md", {
      base_resume_json: baseJson,
      tailored_resume_json: tailoredJson,
    });

    const hallucinationResult = await llmClient.generate({
      prompt: hallucinationPrompt,
      schema: hallucinationCheckOutputSchema,
      featureName: HALLUCINATION_FEATURE,
      userId: this.userId,
      model: DEEPSEEK_MODELS.FLASH,
      thinkingMode: false,
      temperature: 0.1,
    });

    if (hallucinationResult.status === "needs_review") {
      return {
        status: "needs_review",
        step: "hallucination_check",
        validationErrors: hallucinationResult.validationErrors,
        logId: hallucinationResult.logId,
      };
    }

    return {
      status: "success",
      baseResumeId,
      baseContent,
      tailoredContent,
      flaggedClaims: hallucinationResult.content.flagged_claims,
      tailorLogId: tailorResult.logId,
      hallucinationLogId: hallucinationResult.logId,
      modelUsed: model,
      thinkingMode,
      tailorLatencyMs: tailorResult.latencyMs,
      hallucinationLatencyMs: hallucinationResult.latencyMs,
    };
  }
}

export function createResumeTailorService(deps: ResumeTailorServiceDeps) {
  return new ResumeTailorService(deps);
}
