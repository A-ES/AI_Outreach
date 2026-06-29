import { readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import { insertEvalRunResult, listEvalTestCases } from "../src/lib/db/evaluations";
import { ResumeMatchService } from "../src/lib/services/resume-match-service";
import { scoreResumeMatchEval } from "../src/lib/evaluation/resume-match-eval";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const evalUserId = process.env.EVAL_USER_ID;

if (!supabaseUrl || !supabaseKey || !evalUserId) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY, and EVAL_USER_ID"
  );
}

const resolvedSupabaseUrl = supabaseUrl;
const resolvedSupabaseKey = supabaseKey;
const resolvedEvalUserId = evalUserId;

const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseKey);
const sampleResume = readFileSync(
  join(process.cwd(), "scripts/fixtures/sample-resume.txt"),
  "utf-8"
);

async function main() {
  const cases = await listEvalTestCases(supabase);
  if (cases.length !== 25) {
    throw new Error(`Expected 25 eval test cases, found ${cases.length}`);
  }

  const runTimestamp = new Date().toISOString();
  let passed = 0;
  let precisionSum = 0;
  let recallSum = 0;

  for (const testCase of cases) {
    const service = new ResumeMatchService({
      supabase,
      userId: resolvedEvalUserId,
      applicationId: null,
      resolveResumeText: async () => sampleResume,
    });

    const result = await service.analyze(null, testCase.job_description_text);
    if (result.status === "needs_review") {
      await insertEvalRunResult(supabase, {
        eval_test_case_id: testCase.id,
        run_timestamp: runTimestamp,
        actual_match_score: 0,
        keyword_precision: 0,
        keyword_recall: 0,
        passed: false,
        notes: `needs_review: ${result.validationErrors.join("; ")}`,
      });
      continue;
    }

    const metrics = scoreResumeMatchEval(testCase, {
      match_score: result.result.match_score,
      matched_keywords: result.result.matched_keywords,
      missing_keywords: result.result.missing_keywords,
      reasoning_trace: result.result.reasoning_trace,
      confidence_label: result.result.confidence_label,
      confidence_reason: result.result.confidence_reason,
    });

    if (metrics.passed) passed += 1;
    precisionSum += metrics.keyword_precision;
    recallSum += metrics.keyword_recall;

    await insertEvalRunResult(supabase, {
      eval_test_case_id: testCase.id,
      run_timestamp: runTimestamp,
      actual_match_score: metrics.actual_match_score,
      keyword_precision: metrics.keyword_precision,
      keyword_recall: metrics.keyword_recall,
      passed: metrics.passed,
      notes: metrics.notes,
    });

    console.log(
      `${metrics.passed ? "PASS" : "FAIL"} ${testCase.id}: score=${metrics.actual_match_score}, precision=${metrics.keyword_precision.toFixed(2)}, recall=${metrics.keyword_recall.toFixed(2)}`
    );
  }

  console.log("\nResume match eval complete");
  console.log(`Run timestamp: ${runTimestamp}`);
  console.log(`Accuracy: ${((passed / cases.length) * 100).toFixed(1)}%`);
  console.log(`Average precision: ${(precisionSum / cases.length).toFixed(2)}`);
  console.log(`Average recall: ${(recallSum / cases.length).toFixed(2)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
