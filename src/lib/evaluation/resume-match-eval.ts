import type { EvalTestCase } from "@/lib/types";
import type { ResumeMatchLLMOutput } from "@/lib/validation/resume-match";

export interface ResumeMatchEvalMetrics {
  actual_match_score: number;
  keyword_precision: number;
  keyword_recall: number;
  passed: boolean;
  notes: string;
}

export function scoreResumeMatchEval(
  testCase: EvalTestCase,
  actual: ResumeMatchLLMOutput
): ResumeMatchEvalMetrics {
  const expected = normalizeSet(testCase.expected_keywords);
  const actualKeywords = normalizeSet(actual.matched_keywords);
  const overlap = Array.from(actualKeywords).filter((keyword) =>
    expected.has(keyword)
  );

  const keywordPrecision =
    actualKeywords.size === 0 ? (expected.size === 0 ? 1 : 0) : overlap.length / actualKeywords.size;
  const keywordRecall =
    expected.size === 0 ? 1 : overlap.length / expected.size;
  const scoreInRange =
    actual.match_score >= testCase.expected_match_range_min &&
    actual.match_score <= testCase.expected_match_range_max;
  const passed = scoreInRange && keywordPrecision >= 0.5 && keywordRecall >= 0.5;

  return {
    actual_match_score: actual.match_score,
    keyword_precision: keywordPrecision,
    keyword_recall: keywordRecall,
    passed,
    notes: [
      `score_in_range=${scoreInRange}`,
      `expected_range=${testCase.expected_match_range_min}-${testCase.expected_match_range_max}`,
      `actual_keywords=${actual.matched_keywords.join(", ")}`,
      `expected_keywords=${testCase.expected_keywords.join(", ")}`,
    ].join("; "),
  };
}

function normalizeSet(values: string[]): Set<string> {
  return new Set(
    values
      .map((value) => value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim())
      .filter(Boolean)
  );
}
