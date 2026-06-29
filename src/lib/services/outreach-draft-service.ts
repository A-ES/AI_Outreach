import type { SupabaseClient } from "@supabase/supabase-js";
import { getApplication } from "@/lib/db/applications";
import { getContact } from "@/lib/db/contacts";
import { getBaseResume } from "@/lib/db/resumes";
import { createLLMClient } from "@/lib/llm/client";
import type { LLMClient } from "@/lib/llm/client";
import { DEEPSEEK_MODELS } from "@/lib/llm/types";
import { loadPromptTemplate } from "@/lib/llm/prompt-loader";
import {
  formatHighlightsForPrompt,
  retrieveRelevantHighlights,
} from "@/lib/services/resume-content-retrieval";
import { outreachDraftOutputSchema } from "@/lib/validation/outreach";

const FEATURE_NAME = "outreach_draft";

export interface DraftSuccess {
  status: "success";
  subject: string;
  body: string;
  logId: string;
}

export interface DraftNeedsReview {
  status: "needs_review";
  validationErrors: string[];
  logId: string;
}

export type DraftResult = DraftSuccess | DraftNeedsReview;

interface OutreachDraftServiceDeps {
  supabase: SupabaseClient;
  userId: string;
  /** Optional note when regenerating (e.g. "make it shorter"). */
  regenerationNote?: string;
  llmClient?: Pick<LLMClient, "generate">;
}

export class OutreachDraftService {
  private supabase: SupabaseClient;
  private userId: string;
  private regenerationNote?: string;
  private llmClient?: Pick<LLMClient, "generate">;

  constructor(deps: OutreachDraftServiceDeps) {
    this.supabase = deps.supabase;
    this.userId = deps.userId;
    this.regenerationNote = deps.regenerationNote;
    this.llmClient = deps.llmClient;
  }

  /**
   * Generate a personalized outreach email draft for a contact.
   * Uses lightweight keyword retrieval — not vector search.
   */
  async generate(contactId: string): Promise<DraftResult> {
    const contact = await getContact(this.supabase, this.userId, contactId);
    if (!contact) throw new Error("Contact not found");

    let applicationRole: string | null = null;
    let applicationCompany: string | null = null;
    let applicationContext = "No linked application.";

    if (contact.application_id) {
      const app = await getApplication(
        this.supabase,
        this.userId,
        contact.application_id
      );
      if (app) {
        applicationRole = app.role_title;
        applicationCompany = app.company_name;
        applicationContext = [
          `Role: ${app.role_title}`,
          `Company: ${app.company_name}`,
          app.job_description_text
            ? `JD excerpt: ${app.job_description_text.slice(0, 500)}`
            : null,
        ]
          .filter(Boolean)
          .join("\n");
      }
    }

    const baseResume = await getBaseResume(this.supabase, this.userId);
    const highlights = baseResume
      ? retrieveRelevantHighlights(baseResume.content_json, {
          contactRole: contact.role_title,
          contactCompany: contact.company_name,
          applicationRole,
          applicationCompany,
        })
      : [];

    const regenerationNote = this.regenerationNote
      ? `\n## Regeneration feedback\n\nRevise the previous draft with this feedback: ${this.regenerationNote}`
      : "";

    const prompt = loadPromptTemplate("outreach_draft.md", {
      contact_name: contact.name,
      contact_role: contact.role_title ?? "Unknown role",
      contact_company: contact.company_name ?? "Unknown company",
      application_context: applicationContext,
      resume_highlights: formatHighlightsForPrompt(highlights),
      regeneration_note: regenerationNote,
    });

    const llmClient = this.llmClient ?? createLLMClient(this.supabase);
    const result = await llmClient.generate({
      prompt,
      schema: outreachDraftOutputSchema,
      featureName: FEATURE_NAME,
      userId: this.userId,
      model: DEEPSEEK_MODELS.FLASH,
      thinkingMode: false,
      temperature: 0.4,
    });

    if (result.status === "needs_review") {
      return {
        status: "needs_review",
        validationErrors: result.validationErrors,
        logId: result.logId,
      };
    }

    return {
      status: "success",
      subject: result.content.subject,
      body: result.content.body,
      logId: result.logId,
    };
  }
}

export function createOutreachDraftService(deps: OutreachDraftServiceDeps) {
  return new OutreachDraftService(deps);
}
