import { strict as assert } from "assert";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LLMClient } from "../src/lib/llm/client";
import type {
  AdapterGenerateParams,
  AdapterGenerateResult,
  LLMAdapter,
  LLMGenerateResult,
} from "../src/lib/llm/types";
import { ResumeMatchService } from "../src/lib/services/resume-match-service";
import { ResumeTailorService } from "../src/lib/services/resume-tailor-service";
import { OutreachDraftService } from "../src/lib/services/outreach-draft-service";
import { AnalyticsService } from "../src/lib/services/analytics-service";
import type { ResumeContent } from "../src/lib/validation/resume";
import type { OutcomeAnalyticsStats } from "../src/lib/types";

type TableMap = Record<string, Array<Record<string, any>>>;

const userId = "11111111-1111-4111-8111-111111111111";
const applicationId = "22222222-2222-4222-8222-222222222222";
const resumeId = "33333333-3333-4333-8333-333333333333";
const contactId = "44444444-4444-4444-8444-444444444444";

const baseResumeContent: ResumeContent = {
  experience: [
    {
      title: "Software Engineer",
      company: "Atlas",
      dates: "2021-present",
      bullets: ["Built TypeScript APIs and React dashboards."],
    },
  ],
  projects: [{ name: "Evaluator", bullets: ["Measured prompt precision."] }],
  education: [{ degree: "BS Computer Science", school: "State University" }],
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
};

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`);
    console.error(e);
    process.exitCode = 1;
  }
}

function createMockAdapter(responses: string[]): LLMAdapter & { callCount: number } {
  let index = 0;
  const adapter: LLMAdapter & { callCount: number } = {
    providerName: "deepseek",
    callCount: 0,
    async generate(_params: AdapterGenerateParams): Promise<AdapterGenerateResult> {
      adapter.callCount += 1;
      const content = responses[Math.min(index, responses.length - 1)];
      index += 1;
      return {
        content,
        inputTokens: 10,
        outputTokens: 5,
        latencyMs: 25,
        modelName: "deepseek-v4-flash",
        rawResponse: { choices: [{ message: { content } }] },
      };
    },
  };
  return adapter;
}

function createMockLLM(results: Array<LLMGenerateResult<any>>) {
  let index = 0;
  return {
    calls: [] as any[],
    async generate(params: any) {
      this.calls.push(params);
      const result = results[Math.min(index, results.length - 1)];
      index += 1;
      return result;
    },
  };
}

function success<T>(content: T): LLMGenerateResult<T> {
  return {
    status: "success",
    content,
    inputTokens: 10,
    outputTokens: 5,
    latencyMs: 25,
    validationRetryCount: 0,
    logId: crypto.randomUUID(),
  };
}

function retrySuccess<T>(content: T): LLMGenerateResult<T> {
  return { ...success(content), validationRetryCount: 1 };
}

function needsReview(): LLMGenerateResult<any> {
  return {
    status: "needs_review",
    validationErrors: ["root: invalid"],
    rawContent: "{}",
    inputTokens: 10,
    outputTokens: 5,
    latencyMs: 25,
    validationRetryCount: 1,
    logId: crypto.randomUUID(),
  };
}

function createSupabase(tables: TableMap = {}): SupabaseClient & { tables: TableMap } {
  const db = tables;
  return {
    tables: db,
    from(table: string) {
      db[table] ??= [];
      return new QueryBuilder(db, table);
    },
  } as unknown as SupabaseClient & { tables: TableMap };
}

class QueryBuilder {
  private filters: Array<(row: Record<string, any>) => boolean> = [];
  private insertPayload: Record<string, any> | Record<string, any>[] | null = null;
  private updatePayload: Record<string, any> | null = null;
  private orderColumn: string | null = null;
  private ascending = true;
  private tables: TableMap;
  private table: string;

  constructor(tables: TableMap, table: string) {
    this.tables = tables;
    this.table = table;
  }

  select(_columns = "*") {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === "is" && value === null) {
      this.filters.push((row) => row[column] !== null && row[column] !== undefined);
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.ascending = options?.ascending ?? true;
    return Promise.resolve({ data: this.rows(), error: null });
  }

  insert(payload: Record<string, any> | Record<string, any>[]) {
    this.insertPayload = payload;
    return this;
  }

  update(payload: Record<string, any>) {
    this.updatePayload = payload;
    return this;
  }

  async maybeSingle() {
    return { data: this.rows()[0] ?? null, error: null };
  }

  async single() {
    if (this.insertPayload) {
      const rows = Array.isArray(this.insertPayload)
        ? this.insertPayload
        : [this.insertPayload];
      const inserted = rows.map((row) => ({
        id: row.id ?? crypto.randomUUID(),
        created_at: row.created_at ?? new Date().toISOString(),
        updated_at: row.updated_at ?? new Date().toISOString(),
        ...row,
      }));
      this.tables[this.table].push(...inserted);
      return { data: inserted[0], error: null };
    }

    if (this.updatePayload) {
      const rows = this.rows();
      for (const row of rows) Object.assign(row, this.updatePayload);
      return { data: rows[0] ?? null, error: null };
    }

    return { data: this.rows()[0] ?? null, error: null };
  }

  private rows() {
    let rows = this.tables[this.table].filter((row) =>
      this.filters.every((filter) => filter(row))
    );
    if (this.orderColumn) {
      rows = [...rows].sort((a, b) => {
        const av = String(a[this.orderColumn!]);
        const bv = String(b[this.orderColumn!]);
        return this.ascending ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return rows;
  }
}

function seedTables(): TableMap {
  return {
    resumes: [
      {
        id: resumeId,
        user_id: userId,
        version_label: "Base resume",
        content_json: baseResumeContent,
        is_base_resume: true,
        tailored_for_application_id: null,
        created_at: new Date().toISOString(),
      },
    ],
    contacts: [
      {
        id: contactId,
        user_id: userId,
        application_id: applicationId,
        name: "Maya",
        company_name: "Acme",
        role_title: "Engineering Manager",
        email: "maya@example.com",
        linkedin_url: null,
        status: "not_contacted",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    applications: [
      {
        id: applicationId,
        user_id: userId,
        company_name: "Acme",
        role_title: "Backend Engineer",
        job_description_text: "TypeScript backend role",
        status: "saved",
        date_applied: null,
        date_status_changed: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    resume_match_results: [],
    outreach_emails: [
      {
        id: crypto.randomUUID(),
        user_id: userId,
        contact_id: contactId,
        application_id: applicationId,
        subject: "Hello",
        body: "Short email body",
        status: "sent",
        date_drafted: new Date().toISOString(),
        date_sent: new Date().toISOString(),
        reply_received: true,
        outcome: "positive",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    ai_call_logs: [],
  };
}

const resumeMatchOutput = {
  match_score: 86,
  matched_keywords: ["TypeScript", "Node.js", "PostgreSQL"],
  missing_keywords: ["Kubernetes"],
  reasoning_trace: [
    {
      requirement: "Build APIs",
      matched_resume_line: "Built TypeScript APIs",
      matched: true,
    },
  ],
  confidence_label: "medium" as const,
  confidence_reason: "Clear overlap with backend requirements.",
};

const tailoredOutput = {
  tailored_content: baseResumeContent,
};

const analyticsStats: OutcomeAnalyticsStats = {
  logged_outcome_count: 20,
  sent_count: 20,
  reply_count: 6,
  overall_reply_rate: 30,
  by_resume_version: [{ label: "Base", sent_count: 20, reply_count: 6, reply_rate: 30 }],
  by_day_sent: [{ label: "Mon", sent_count: 20, reply_count: 6, reply_rate: 30 }],
  by_email_length: [{ label: "Short (<100 words)", sent_count: 20, reply_count: 6, reply_rate: 30 }],
  reply_rate_over_time: [{ label: "2026-06-28", sent_count: 20, reply_count: 6, reply_rate: 30 }],
};

async function validationTests() {
  const schema = z.object({ score: z.number(), label: z.string() });

  await test("validation layer: valid input passes without retry", async () => {
    const adapter = createMockAdapter(['{"score": 90, "label": "ok"}']);
    const result = await new LLMClient({
      adapter,
      supabase: createSupabase({ ai_call_logs: [] }),
    }).generate({ prompt: "x", schema, featureName: "test", userId });
    assert.equal(result.status, "success");
    assert.equal(result.validationRetryCount, 0);
    assert.equal(adapter.callCount, 1);
  });

  await test("validation layer: invalid input triggers retry", async () => {
    const adapter = createMockAdapter([
      '{"score": "bad"}',
      '{"score": 80, "label": "ok"}',
    ]);
    const result = await new LLMClient({
      adapter,
      supabase: createSupabase({ ai_call_logs: [] }),
    }).generate({ prompt: "x", schema, featureName: "test", userId });
    assert.equal(result.status, "success");
    assert.equal(result.validationRetryCount, 1);
    assert.equal(adapter.callCount, 2);
  });

  await test("validation layer: invalid after retry returns needs_review", async () => {
    const adapter = createMockAdapter(['{"score": "bad"}', '{"score": "still bad"}']);
    const result = await new LLMClient({
      adapter,
      supabase: createSupabase({ ai_call_logs: [] }),
    }).generate({ prompt: "x", schema, featureName: "test", userId });
    assert.equal(result.status, "needs_review");
    assert.equal(result.validationRetryCount, 1);
    assert.equal(adapter.callCount, 2);
  });
}

async function resumeMatchServiceTests() {
  for (const [label, llmResult] of [
    ["normal success", success(resumeMatchOutput)],
    ["retry success", retrySuccess(resumeMatchOutput)],
  ] as const) {
    await test(`ResumeMatchService: ${label}`, async () => {
      const supabase = createSupabase(seedTables());
      const service = new ResumeMatchService({
        supabase,
        userId,
        resolveResumeText: async () => "TypeScript resume",
        llmClient: createMockLLM([llmResult]),
      });
      const result = await service.analyze(null, "Backend TypeScript job");
      assert.equal(result.status, "success");
      assert.equal(supabase.tables.resume_match_results.length, 1);
    });
  }

  await test("ResumeMatchService: persistent validation failure returns needs_review", async () => {
    const service = new ResumeMatchService({
      supabase: createSupabase(seedTables()),
      userId,
      resolveResumeText: async () => "TypeScript resume",
      llmClient: createMockLLM([needsReview()]),
    });
    const result = await service.analyze(null, "Backend job");
    assert.equal(result.status, "needs_review");
  });
}

async function resumeTailorServiceTests() {
  for (const [label, llmResult] of [
    ["normal success", success(tailoredOutput)],
    ["retry success", retrySuccess(tailoredOutput)],
  ] as const) {
    await test(`ResumeTailorService: ${label}`, async () => {
      const service = new ResumeTailorService({
        supabase: createSupabase(seedTables()),
        userId,
        llmClient: createMockLLM([llmResult, success({ flagged_claims: [] })]),
      });
      const result = await service.tailor(resumeId, "TypeScript job");
      assert.equal(result.status, "success");
      if (result.status === "success") assert.equal(result.flaggedClaims.length, 0);
    });
  }

  await test("ResumeTailorService: persistent validation failure returns needs_review", async () => {
    const service = new ResumeTailorService({
      supabase: createSupabase(seedTables()),
      userId,
      llmClient: createMockLLM([needsReview()]),
    });
    const result = await service.tailor(resumeId, "TypeScript job");
    assert.equal(result.status, "needs_review");
  });
}

async function outreachDraftServiceTests() {
  for (const [label, llmResult] of [
    ["normal success", success({ subject: "Hello", body: "Nice to meet you." })],
    ["retry success", retrySuccess({ subject: "Hello", body: "Nice to meet you." })],
  ] as const) {
    await test(`OutreachDraftService: ${label}`, async () => {
      const service = new OutreachDraftService({
        supabase: createSupabase(seedTables()),
        userId,
        llmClient: createMockLLM([llmResult]),
      });
      const result = await service.generate(contactId);
      assert.equal(result.status, "success");
      if (result.status === "success") assert.equal(result.subject, "Hello");
    });
  }

  await test("OutreachDraftService: persistent validation failure returns needs_review", async () => {
    const service = new OutreachDraftService({
      supabase: createSupabase(seedTables()),
      userId,
      llmClient: createMockLLM([needsReview()]),
    });
    const result = await service.generate(contactId);
    assert.equal(result.status, "needs_review");
  });
}

async function analyticsServiceTests() {
  await test("AnalyticsService: insufficient data skips LLM call", async () => {
    const llm = createMockLLM([success({})]);
    const service = new AnalyticsService(createSupabase(), {
      llmClient: llm,
      statsProvider: async () => ({ ...analyticsStats, logged_outcome_count: 7 }),
    });
    const result = await service.generateInsights(userId);
    assert.equal("insufficient_data" in result, true);
    assert.equal(llm.calls.length, 0);
  });

  for (const [label, llmResult] of [
    [
      "normal success",
      success({
        observation: "Short emails perform better.",
        evidence: ["Short emails have 30% reply rate."],
        possible_reason: "They are easier to scan.",
        confidence: "medium" as const,
        sample_size_note: "Based on 20 sent emails, 6 replies",
      }),
    ],
    [
      "retry success",
      retrySuccess({
        observation: "Short emails perform better.",
        evidence: ["Short emails have 30% reply rate."],
        possible_reason: "They are easier to scan.",
        confidence: "medium" as const,
        sample_size_note: "Based on 20 sent emails, 6 replies",
      }),
    ],
  ] as const) {
    await test(`AnalyticsService: ${label}`, async () => {
      const service = new AnalyticsService(createSupabase(), {
        llmClient: createMockLLM([llmResult]),
        statsProvider: async () => analyticsStats,
      });
      const result = await service.generateInsights(userId);
      assert.equal("observation" in result, true);
    });
  }

  await test("AnalyticsService: persistent validation failure throws", async () => {
    const service = new AnalyticsService(createSupabase(), {
      llmClient: createMockLLM([needsReview()]),
      statsProvider: async () => analyticsStats,
    });
    await assert.rejects(() => service.generateInsights(userId), /validation failed/);
  });
}

async function integrationTests() {
  await test("Integration: resume match writes a result row", async () => {
    const supabase = createSupabase(seedTables());
    const service = new ResumeMatchService({
      supabase,
      userId,
      resolveResumeText: async () => "TypeScript resume",
      llmClient: createMockLLM([success(resumeMatchOutput)]),
    });
    await service.analyze(null, "Backend job");
    assert.equal(supabase.tables.resume_match_results[0].match_score, 86);
  });

  await test("Integration: tailoring reads base resume and returns hallucination check", async () => {
    const service = new ResumeTailorService({
      supabase: createSupabase(seedTables()),
      userId,
      llmClient: createMockLLM([
        success(tailoredOutput),
        success({ flagged_claims: [{ claim: "New claim", reason: "Not in base" }] }),
      ]),
    });
    const result = await service.tailor(resumeId, "Backend job");
    assert.equal(result.status, "success");
    if (result.status === "success") assert.equal(result.flaggedClaims.length, 1);
  });

  await test("Integration: outreach draft reads contact, application, and resume", async () => {
    const service = new OutreachDraftService({
      supabase: createSupabase(seedTables()),
      userId,
      llmClient: createMockLLM([success({ subject: "Intro", body: "Hello Maya" })]),
    });
    const result = await service.generate(contactId);
    assert.equal(result.status, "success");
  });

  await test("Integration: analytics computes insufficient-data result from stats table", async () => {
    const service = new AnalyticsService(createSupabase(seedTables()));
    const result = await service.generateInsights(userId);
    assert.equal("insufficient_data" in result, true);
  });
}

async function main() {
  await validationTests();
  await resumeMatchServiceTests();
  await resumeTailorServiceTests();
  await outreachDraftServiceTests();
  await analyticsServiceTests();
  await integrationTests();

  if (process.exitCode) process.exit(process.exitCode);
}

main();
