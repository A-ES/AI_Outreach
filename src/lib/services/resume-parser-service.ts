import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type Database from "better-sqlite3";
import { createLLMClient } from "@/lib/llm/client";
import type { LLMClient } from "@/lib/llm/client";
import { loadPromptTemplate } from "@/lib/llm/prompt-loader";
import { DEEPSEEK_MODELS } from "@/lib/llm/types";
import type { ResumeContent } from "@/lib/validation/resume";
import { resumeContentSchema } from "@/lib/validation/resume";

const FEATURE_NAME = "resume_parse";
const MIN_EXTRACTABLE_TEXT_LENGTH = 80;
const BUNDLED_PYTHON_PATH =
  "/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3.12";
const execFileAsync = promisify(execFile);

export interface PdfInspection {
  text: string;
  pages: Array<{ num: number; text: string }>;
  pageCount: number;
  tableCount: number;
  hasTextLayer: boolean;
  rawPdfText: string;
}

interface ResumeParserServiceDeps {
  db: Database.Database;
  userId: string;
  llmClient?: Pick<LLMClient, "generate">;
}

export class ResumeParserService {
  private readonly db: Database.Database;
  private readonly userId: string;
  private readonly llmClient?: Pick<LLMClient, "generate">;

  constructor(deps: ResumeParserServiceDeps) {
    this.db = deps.db;
    this.userId = deps.userId;
    this.llmClient = deps.llmClient;
  }

  async parsePdf(file: File): Promise<ResumeContent> {
    const inspection = await this.inspectPdf(file);
    if (!inspection.hasTextLayer) {
      throw new Error("No extractable text found in this PDF");
    }

    const prompt = loadPromptTemplate("resume_parse_segment.md", {
      resume_text: inspection.text.slice(0, 18000),
    });

    const llmClient = this.llmClient ?? createLLMClient(this.db);
    const result = await llmClient.generate({
      prompt,
      schema: resumeContentSchema,
      featureName: FEATURE_NAME,
      userId: this.userId,
      model: DEEPSEEK_MODELS.FLASH,
      thinkingMode: false,
      temperature: 0.1,
    });

    if (result.status !== "success") {
      throw new Error(
        `Resume parsing validation failed: ${result.validationErrors.join("; ")}`
      );
    }

    return result.content;
  }

  async inspectPdf(file: File): Promise<PdfInspection> {
    const buffer = Buffer.from(await file.arrayBuffer());
    return inspectPdfBuffer(buffer);
  }
}

export async function inspectPdfBuffer(buffer: Buffer): Promise<PdfInspection> {
  const rawPdfText = buffer.toString("latin1");
  const pdfjsInspection = await inspectWithPdfJs(buffer, rawPdfText);
  if (pdfjsInspection?.hasTextLayer) {
    return pdfjsInspection;
  }

  const pythonInspection = await inspectWithPython(buffer, rawPdfText);
  if (pythonInspection?.hasTextLayer) {
    return pythonInspection;
  }

  if (pdfjsInspection && pdfjsInspection.text.length >= (pythonInspection?.text.length ?? 0)) {
    return pdfjsInspection;
  }

  if (pythonInspection) {
    return pythonInspection;
  }

  const fallbackText = normalizeText(extractPdfLiteralText(rawPdfText));
  return buildInspection(rawPdfText, {
    text: fallbackText,
    pages: fallbackText ? [{ num: 1, text: fallbackText }] : [],
    pageCount: estimatePageCount(rawPdfText),
    tableCount: estimateTableCount(rawPdfText, fallbackText),
  });
}

export function createResumeParserService(deps: ResumeParserServiceDeps) {
  return new ResumeParserService(deps);
}

async function inspectWithPdfJs(
  buffer: Buffer,
  rawPdfText: string
): Promise<PdfInspection | null> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
    });
    const document = await loadingTask.promise;
    const pages: Array<{ num: number; text: string }> = [];

    try {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const textContent = await page.getTextContent();
        pages.push({
          num: pageNumber,
          text: normalizeText(renderTextItems(textContent.items)),
        });
        page.cleanup();
      }

      const text = normalizeText(pages.map((page) => page.text).join("\n\n"));
      const tableCount = estimateTableCount(rawPdfText, text);

      return buildInspection(rawPdfText, {
        text,
        pages,
        pageCount: document.numPages,
        tableCount,
      });
    } finally {
      await document.destroy();
    }
  } catch {
    return null;
  }
}

async function inspectWithPython(
  buffer: Buffer,
  rawPdfText: string
): Promise<PdfInspection | null> {
  const workingDir = await mkdtemp(path.join(tmpdir(), "ai-outreach-pdf-"));
  const pdfPath = path.join(workingDir, "resume.pdf");

  try {
    await writeFile(pdfPath, buffer);
    const { stdout } = await execFileAsync(BUNDLED_PYTHON_PATH, [
      "-c",
      PYTHON_PDF_EXTRACTOR,
      pdfPath,
    ]);
    const parsed = JSON.parse(stdout) as {
      pages?: Array<{ num?: unknown; text?: unknown }>;
      pageCount?: unknown;
      tableCount?: unknown;
    };
    const pages = (parsed.pages ?? [])
      .map((page, index) => ({
        num: typeof page.num === "number" ? page.num : index + 1,
        text: normalizeText(typeof page.text === "string" ? page.text : ""),
      }))
      .filter((page) => page.text.length > 0);
    const text = normalizeText(pages.map((page) => page.text).join("\n\n"));
    const pageCount =
      typeof parsed.pageCount === "number" && parsed.pageCount > 0
        ? parsed.pageCount
        : Math.max(pages.length, estimatePageCount(rawPdfText));
    const tableCount =
      typeof parsed.tableCount === "number" && parsed.tableCount >= 0
        ? parsed.tableCount
        : estimateTableCount(rawPdfText, text);

    return buildInspection(rawPdfText, {
      text,
      pages,
      pageCount,
      tableCount: Math.max(tableCount, estimateTableCount(rawPdfText, text)),
    });
  } catch {
    return null;
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }
}

function buildInspection(
  rawPdfText: string,
  inspection: Omit<PdfInspection, "hasTextLayer" | "rawPdfText">
): PdfInspection {
  return {
    ...inspection,
    hasTextLayer:
      inspection.text.replace(/\s/g, "").length >= MIN_EXTRACTABLE_TEXT_LENGTH,
    rawPdfText,
  };
}

function normalizeText(value: string) {
  return value.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function renderTextItems(items: unknown[]): string {
  const lines: Array<{ y: number; parts: Array<{ x: number; text: string }> }> = [];

  for (const item of items) {
    if (!isTextItem(item) || !item.str.trim()) continue;
    const x = item.transform[4] ?? 0;
    const y = item.transform[5] ?? 0;
    let line = lines.find((candidate) => Math.abs(candidate.y - y) < 3);
    if (!line) {
      line = { y, parts: [] };
      lines.push(line);
    }
    line.parts.push({ x, text: item.str });
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) =>
      line.parts
        .sort((a, b) => a.x - b.x)
        .map((part) => part.text)
        .join(" ")
    )
    .join("\n");
}

function isTextItem(
  item: unknown
): item is { str: string; transform: number[] } {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    "transform" in item &&
    typeof (item as { str?: unknown }).str === "string" &&
    Array.isArray((item as { transform?: unknown }).transform)
  );
}

function estimateTableCount(rawPdfText: string, extractedText: string): number {
  const structureTags = (rawPdfText.match(/\/(Table|TR|TD|TH)\b/g) ?? []).length;
  const formTextBoxes = (rawPdfText.match(/\b\/Tx\b/g) ?? []).length;
  const gridLikeLines = extractedText
    .split("\n")
    .filter((line) => /\S+\s{3,}\S+\s{3,}\S+/.test(line)).length;

  return Math.min(10, structureTags + formTextBoxes + Math.floor(gridLikeLines / 4));
}

function estimatePageCount(rawPdfText: string): number {
  const pageMarkers = rawPdfText.match(/\/Type\s*\/Page\b/g) ?? [];
  return Math.max(1, pageMarkers.length);
}

function extractPdfLiteralText(rawPdfText: string): string {
  const snippets: string[] = [];
  const literalMatches = Array.from(
    rawPdfText.matchAll(/\(([^()]{2,})\)\s*T[Jj]/g)
  );
  for (const match of literalMatches) {
    snippets.push(unescapePdfString(match[1]));
  }

  const arrayMatches = Array.from(
    rawPdfText.matchAll(/\[((?:\s*\([^()]{1,}\)\s*-?\d*)+)\]\s*TJ/g)
  );
  for (const match of arrayMatches) {
    const parts = Array.from(match[1].matchAll(/\(([^()]+)\)/g));
    snippets.push(Array.from(parts, (part) => unescapePdfString(part[1])).join(""));
  }

  return snippets.join("\n");
}

function unescapePdfString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

const PYTHON_PDF_EXTRACTOR = String.raw`
import json
import sys

pdf_path = sys.argv[1]

def emit(payload):
    print(json.dumps(payload))

try:
    import pdfplumber

    pages = []
    table_count = 0
    with pdfplumber.open(pdf_path) as pdf:
        for index, page in enumerate(pdf.pages):
            text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
            pages.append({"num": index + 1, "text": text})
            try:
                table_count += len(page.find_tables() or [])
            except Exception:
                pass
        emit({
            "pages": pages,
            "pageCount": len(pdf.pages),
            "tableCount": table_count,
        })
except Exception:
    try:
        from pypdf import PdfReader

        reader = PdfReader(pdf_path)
        pages = []
        for index, page in enumerate(reader.pages):
            pages.append({"num": index + 1, "text": page.extract_text() or ""})
        emit({
            "pages": pages,
            "pageCount": len(reader.pages),
            "tableCount": 0,
        })
    except Exception:
        emit({"pages": [], "pageCount": 0, "tableCount": 0})
`;
