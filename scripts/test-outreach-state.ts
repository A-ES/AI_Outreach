/**
 * State machine tests for outreach email status transitions.
 * Run: npm run test:outreach-state
 */

import {
  assertCanSend,
  assertCanEdit,
  canTransition,
} from "../src/lib/validation/outreach";

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

assert("draft → approved allowed", () => {
  if (!canTransition("draft", "approved")) throw new Error("expected allowed");
});

assert("draft → sent blocked", () => {
  if (canTransition("draft", "sent")) throw new Error("expected blocked");
});

assert("approved → sent allowed", () => {
  if (!canTransition("approved", "sent")) throw new Error("expected allowed");
});

assert("assertCanSend throws for draft", () => {
  let threw = false;
  try {
    assertCanSend("draft");
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("expected throw");
});

assert("assertCanSend passes for approved", () => {
  assertCanSend("approved");
});

assert("assertCanEdit throws for approved", () => {
  let threw = false;
  try {
    assertCanEdit("approved");
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("expected throw");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
