/**
 * Manual test for resume match output schema validation.
 * Run: npm run test:resume-match-schema
 */

import { resumeMatchOutputSchema } from "../src/lib/validation/resume-match";

let passed = 0;
let failed = 0;

function assert(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (e) {
    console.error(`✗ ${name}`);
    console.error(`  ${e instanceof Error ? e.message : e}`);
    failed += 1;
  }
}

const validOutput = {
  match_score: 78,
  matched_keywords: ["Python"],
  missing_keywords: ["Kubernetes"],
  reasoning_trace: [
    {
      requirement: "3+ years backend",
      matched_resume_line: "Backend Engineer, 2022-present",
      matched: true,
    },
  ],
  confidence_label: "high" as const,
  confidence_reason: "Explicit requirements in JD.",
};

assert("accepts valid output", () => {
  const result = resumeMatchOutputSchema.safeParse(validOutput);
  if (!result.success) throw new Error(result.error.message);
});

assert("rejects medium confidence with empty reason", () => {
  const result = resumeMatchOutputSchema.safeParse({
    ...validOutput,
    confidence_label: "medium",
    confidence_reason: "   ",
  });
  if (result.success) throw new Error("Expected validation failure");
});

assert("accepts medium confidence with reason", () => {
  const result = resumeMatchOutputSchema.safeParse({
    ...validOutput,
    confidence_label: "medium",
    confidence_reason: "JD is vague on stack requirements.",
  });
  if (!result.success) throw new Error(result.error.message);
});

assert("rejects low confidence with empty reason", () => {
  const result = resumeMatchOutputSchema.safeParse({
    ...validOutput,
    confidence_label: "low",
    confidence_reason: "",
  });
  if (result.success) throw new Error("Expected validation failure");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
