import type Database from "better-sqlite3";
import { insertAtsCheckResult } from "@/lib/db/ats-check-results";
import { createLLMClient } from "@/lib/llm/client";
import type { LLMClient } from "@/lib/llm/client";
import { loadPromptTemplate } from "@/lib/llm/prompt-loader";
import { DEEPSEEK_MODELS } from "@/lib/llm/types";
import {
  type AtsCheckItem,
  type AtsCheckResult,
  atsHeaderCheckSchema,
} from "@/lib/validation/ats";
import {
  createResumeParserService,
  type PdfInspection,
} from "@/lib/services/resume-parser-service";

const FEATURE_NAME = "ats_header_check";

interface AtsCheckServiceDeps {
  db: Database.Database;
  userId: string;
  resumeId?: string | null;
  llmClient?: Pick<LLMClient, "generate">;
}

export class AtsCheckService {
  private readonly db: Database.Database;
  private readonly userId: string;
  private readonly resumeId: string | null;
  private readonly llmClient?: Pick<LLMClient, "generate">;

  constructor(deps: AtsCheckServiceDeps) {
    this.db = deps.db;
    this.userId = deps.userId;
    this.resumeId = deps.resumeId ?? null;
    this.llmClient = deps.llmClient;
  }

  async check(resumeFileOrId: File): Promise<AtsCheckResult> {
    const parser = createResumeParserService({
      db: this.db,
      userId: this.userId,
    });
    const inspection = await parser.inspectPdf(resumeFileOrId);
    const deterministicChecks = buildDeterministicChecks(inspection);
    const headerCheck = await this.runHeaderCheck(inspection.text);
    const checks = [
      deterministicChecks.textExtractability,
      deterministicChecks.multiColumnLayout,
      headerCheck,
      deterministicChecks.contactInfoLocation,
      deterministicChecks.tablesOrTextboxes,
      deterministicChecks.specialCharacters,
    ];

    // Add actionable recommendations for failing checks
    for (const check of checks) {
      if (!check.passed && check.suggested_fix) {
        check.recommendation = check.suggested_fix;
      }
    }

    const score = computeAtsScore(checks);
    const result = {
      overall_pass: checks.every((check) => check.passed),
      checks,
      score,
    };

    insertAtsCheckResult(this.db, {
      user_id: this.userId,
      resume_id: this.resumeId,
      result,
    });

    return result;
  }

  private async runHeaderCheck(text: string): Promise<AtsCheckItem> {
    if (text.replace(/\s/g, "").length < 80) {
      return {
        check_name: "section_headers_recognizable",
        passed: false,
        detail: "Section headers could not be evaluated because the PDF has little extractable text.",
        suggested_fix: "Export the resume as a text-based PDF instead of a scanned image.",
      };
    }

    const prompt = loadPromptTemplate("ats_header_check.md", {
      resume_text: text.slice(0, 12000),
    });
    const llmClient = this.llmClient ?? createLLMClient(this.db);
    const result = await llmClient.generate({
      prompt,
      schema: atsHeaderCheckSchema,
      featureName: FEATURE_NAME,
      userId: this.userId,
      model: DEEPSEEK_MODELS.FLASH,
      thinkingMode: false,
      temperature: 0.1,
    });

    if (result.status !== "success") {
      return {
        check_name: "section_headers_recognizable",
        passed: false,
        detail: "The header recognizability check could not be validated.",
        suggested_fix: "Use plain text section headers such as Experience, Education, Projects, and Skills.",
      };
    }

    return {
      check_name: "section_headers_recognizable",
      passed: result.content.passed,
      detail: result.content.detail,
      suggested_fix: result.content.suggested_fix || undefined,
    };
  }
}

export function createAtsCheckService(deps: AtsCheckServiceDeps) {
  return new AtsCheckService(deps);
}

function buildDeterministicChecks(inspection: PdfInspection) {
  return {
    textExtractability: checkTextExtractability(inspection),
    multiColumnLayout: checkMultiColumnLayout(inspection),
    contactInfoLocation: checkContactInfoLocation(inspection),
    tablesOrTextboxes: checkTablesOrTextboxes(inspection),
    specialCharacters: checkSpecialCharacters(inspection),
  };
}

function checkTextExtractability(inspection: PdfInspection): AtsCheckItem {
  if (inspection.hasTextLayer) {
    return {
      check_name: "text_extractability",
      passed: true,
      detail: "Resume contains a real text layer.",
    };
  }
  return {
    check_name: "text_extractability",
    passed: false,
    detail: "Very little extractable text was found; this may be a scanned image PDF.",
    suggested_fix: "Export from your resume editor as a text-based PDF, or run OCR before uploading.",
  };
}

function checkMultiColumnLayout(inspection: PdfInspection): AtsCheckItem {
  const suspiciousPages = inspection.pages.filter((page) =>
    page.text
      .split("\n")
      .some((line) => /\S{2,}\s{8,}\S{2,}/.test(line) && line.length > 45)
  );

  if (suspiciousPages.length === 0) {
    return {
      check_name: "multi_column_layout",
      passed: true,
      detail: "No obvious multi-column text flow was detected.",
    };
  }

  return {
    check_name: "multi_column_layout",
    passed: false,
    detail: `Detected wide text gaps that often indicate columns on ${suspiciousPages.length} page(s).`,
    suggested_fix: "Convert the resume to a single-column layout with normal top-to-bottom reading order.",
  };
}

function checkContactInfoLocation(inspection: PdfInspection): AtsCheckItem {
  const firstPage = inspection.pages[0]?.text ?? inspection.text;
  const lines = firstPage.split("\n").filter((line) => line.trim().length > 0);
  const contactPattern = /@|linkedin\.com|github\.com|\+?\d[\d\s().-]{7,}/i;
  const contactLineIndex = lines.findIndex((line) => contactPattern.test(line));

  if (contactLineIndex === -1) {
    return {
      check_name: "contact_info_location",
      passed: false,
      detail: "No clear email, phone number, or LinkedIn URL was found in extracted text.",
      suggested_fix: "Place contact information as plain text near the top of the resume body.",
    };
  }

  if (contactLineIndex <= 4) {
    return {
      check_name: "contact_info_location",
      passed: true,
      detail: "Contact info appears near the top of the main extracted text.",
    };
  }

  return {
    check_name: "contact_info_location",
    passed: false,
    detail: "Contact info was found, but not near the top of the extracted resume text.",
    suggested_fix: "Move contact information into the main body near your name, not only into headers or footers.",
  };
}

function checkTablesOrTextboxes(inspection: PdfInspection): AtsCheckItem {
  const raw = inspection.rawPdfText;
  const textBoxOperators = (raw.match(/\b\/Tx\b/g) ?? []).length;
  const annotationCount = (raw.match(/\/Subtype\s*\/(Widget|FreeText|Square)/g) ?? []).length;
  const hasPdfStructureSignal = textBoxOperators + annotationCount > 0;

  if (inspection.tableCount === 0 && !hasPdfStructureSignal) {
    return {
      check_name: "tables_or_textboxes",
      passed: true,
      detail: "No table grids or obvious floating text box structures were detected.",
    };
  }

  return {
    check_name: "tables_or_textboxes",
    passed: false,
    detail:
      inspection.tableCount > 0
        ? `Detected ${inspection.tableCount} table-like structure(s) in the PDF.`
        : "Detected PDF form/text-box structures that can disrupt ATS reading order.",
    suggested_fix: "Replace tables and floating text boxes with plain paragraphs and simple lists.",
  };
}

function checkSpecialCharacters(inspection: PdfInspection): AtsCheckItem {
  const suspiciousChars = inspection.text.match(/[•●◦▪▫◆◇■□✓✔★→⇒]/g) ?? [];
  const replacementChars = inspection.text.match(/\uFFFD/g) ?? [];
  if (suspiciousChars.length === 0 && replacementChars.length === 0) {
    return {
      check_name: "special_characters",
      passed: true,
      detail: "No non-standard bullet characters or garbled replacement characters were detected.",
    };
  }

  return {
    check_name: "special_characters",
    passed: false,
    detail: `Detected ${suspiciousChars.length + replacementChars.length} potentially problematic special character(s).`,
    suggested_fix: "Use simple hyphens or standard round bullets and avoid icon fonts in resume content.",
  };
}

/** Weighted scoring: each check has a weight, total adds to 100 */
const CHECK_WEIGHTS: Record<string, number> = {
  text_extractability: 30,
  multi_column_layout: 20,
  section_headers_recognizable: 20,
  contact_info_location: 10,
  tables_or_textboxes: 10,
  special_characters: 10,
};

function computeAtsScore(checks: AtsCheckItem[]): number {
  let total = 0;
  for (const check of checks) {
    const weight = CHECK_WEIGHTS[check.check_name] ?? 10;
    if (check.passed) total += weight;
  }
  return Math.min(100, Math.max(0, total));
}
