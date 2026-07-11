import type Database from "better-sqlite3";
import { insertResumeMatchResult } from "@/lib/db/resume-match-results";
import { getResume, resumeContentToText } from "@/lib/db/resumes";
import { createLLMClient } from "@/lib/llm/client";
import type { LLMClient } from "@/lib/llm/client";
import { DEEPSEEK_MODELS } from "@/lib/llm/types";
import { loadPromptTemplate } from "@/lib/llm/prompt-loader";
import type { ResumeMatchResult } from "@/lib/types";
import { resumeMatchOutputSchema } from "@/lib/validation/resume-match";

const FEATURE_NAME = "resume_match";

export type ResumeMatchAnalyzeSuccess = {
  status: "success";
  result: ResumeMatchResult;
  logId: string;
};

export type ResumeMatchAnalyzeNeedsReview = {
  status: "needs_review";
  validationErrors: string[];
  logId: string;
};

export type MatchResult = ResumeMatchAnalyzeSuccess | ResumeMatchAnalyzeNeedsReview;

interface ResumeMatchServiceDeps {
  db: Database.Database;
  userId: string;
  applicationId?: string | null;
  /** Resolves resume text by ID from the resumes table, or pasted text when id is null. */
  resolveResumeText: (resumeId: string | null) => Promise<string>;
  llmClient?: Pick<LLMClient, "generate">;
}

export async function resolveResumeTextFromDb(
  db: Database.Database,
  userId: string,
  resumeId: string | null,
  pastedText?: string
): Promise<string> {
  if (resumeId) {
    const resume = getResume(db, userId, resumeId);
    if (!resume) throw new Error("Resume not found");
    return resumeContentToText(resume.content_json);
  }
  if (pastedText?.trim()) return pastedText;
  throw new Error("Resume text is required");
}

export class ResumeMatchService {
  private db: Database.Database;
  private userId: string;
  private applicationId: string | null;
  private resolveResumeText: (resumeId: string | null) => Promise<string>;
  private llmClient?: Pick<LLMClient, "generate">;

  constructor(deps: ResumeMatchServiceDeps) {
    this.db = deps.db;
    this.userId = deps.userId;
    this.applicationId = deps.applicationId ?? null;
    this.resolveResumeText = deps.resolveResumeText;
    this.llmClient = deps.llmClient;
  }

  /**
   * Compare a resume against a job description and persist a validated match result.
   * @param resumeId — resume UUID when stored (Phase 4+); null for pasted resume text
   * @param jobDescriptionText — full job description to match against
   */
  async analyze(
    resumeId: string | null,
    jobDescriptionText: string
  ): Promise<MatchResult> {
    const resumeText = await this.resolveResumeText(resumeId);

    if (!jobDescriptionText.trim()) {
      throw new Error("Job description text is required");
    }
    if (!resumeText.trim()) {
      throw new Error("Resume text is required");
    }

    const prompt = loadPromptTemplate("resume_match.md", {
      job_description: jobDescriptionText.trim(),
      resume_text: resumeText.trim(),
    });

    const llmClient = this.llmClient ?? createLLMClient(this.db);
    const llmResult = await llmClient.generate({
      prompt,
      schema: resumeMatchOutputSchema,
      featureName: FEATURE_NAME,
      userId: this.userId,
      model: DEEPSEEK_MODELS.FLASH,
      thinkingMode: false,
      temperature: 0.2,
    });

    if (llmResult.status === "needs_review") {
      return {
        status: "needs_review",
        validationErrors: llmResult.validationErrors,
        logId: llmResult.logId,
      };
    }

    const saved = insertResumeMatchResult(this.db, {
      user_id: this.userId,
      application_id: this.applicationId,
      resume_id: resumeId,
      output: llmResult.content,
    });

    return {
      status: "success",
      result: saved,
      logId: llmResult.logId,
    };
  }
}

export function createResumeMatchService(deps: ResumeMatchServiceDeps) {
  return new ResumeMatchService(deps);
}
