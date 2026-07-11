# Implementation Plan: Personalized Outreach Drafting

## Overview

This plan implements personalized, variant-aware outreach email drafting with bulk operations and an improved inline review experience. The implementation extends the existing Contact model, OutreachDraftService, and outreach UI with new fields, template variants, bulk generation, and inline editing capabilities.

## Tasks

- [ ] 1. Data layer: extend Contact model and DB schema
  - [ ] 1.1 Add personalization columns to contacts table migration
    - In `src/lib/db/sqlite.ts`, add migration checks (PRAGMA table_info pattern) for `company_one_liner TEXT`, `personalization_hook TEXT`, and `platform_source TEXT` columns on the `contacts` table
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 1.2 Update Contact type and validation schemas
    - In `src/lib/types.ts`, add `company_one_liner: string | null`, `personalization_hook: string | null`, and `platform_source: string | null` to the `Contact` interface
    - In `src/lib/validation/schemas.ts`, extend `contactCreateSchema` with: `company_one_liner` (string, max 200, optional, nullable), `personalization_hook` (string, max 500, optional, nullable), `platform_source` (string, max 100, optional, nullable)
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 1.3 Update contact DB functions for new fields
    - In `src/lib/db/contacts.ts`, update `createContact` INSERT statement to include the three new columns
    - Update `updateContact` to handle the three new fields in its dynamic update builder
    - _Requirements: 1.4_

  - [ ]* 1.4 Write property tests for contact field validation (P1, P2)
    - **Property 1: Contact personalization field length validation**
    - **Property 2: Contact field persistence round-trip**
    - Install `fast-check` as a dev dependency; create test file `src/__tests__/properties/contact-fields.property.test.ts`
    - Use random strings from 0–600 chars to verify schema accepts ≤200/≤500 and rejects longer
    - Use random valid contact objects to verify create→get round-trip preserves all three new fields
    - **Validates: Requirements 1.1, 1.2, 1.4**

- [ ] 2. Template variants and variant preferences
  - [ ] 2.1 Create template variant constants
    - Create `src/lib/constants/template-variants.ts` with the `TemplateVariant` interface, `TEMPLATE_VARIANTS` array (founder_cold, warm_referral, job_posting_followup, alumni_network), `DEFAULT_VARIANT_ID`, and `getVariantById` helper function
    - _Requirements: 3.1, 3.4_

  - [ ] 2.2 Create variant preference localStorage helper
    - Create `src/lib/utils/variant-preferences.ts` with `getVariantForPlatform(platformSource)` and `setVariantForPlatform(platformSource, variantId)` functions using localStorage key `"outreach_variant_prefs"`
    - _Requirements: 3.3_

  - [ ]* 2.3 Write property test for variant preference round-trip (P6)
    - **Property 6: Variant preference round-trip**
    - Create test file `src/__tests__/properties/variant-preferences.property.test.ts`
    - Use random platform strings × random variant IDs to verify set→get returns stored value
    - Mock localStorage in test environment
    - **Validates: Requirements 3.3**

- [ ] 3. Outreach draft service: variant and personalization awareness
  - [ ] 3.1 Update prompt template with variant and personalization placeholders
    - Update `prompts/outreach_draft.md` to include: `{{variant_label}}`, `{{variant_tone_rules}}`, `{{variant_structure_notes}}`, `{{company_one_liner}}`, `{{personalization_hook}}` placeholders as specified in the design
    - Add the "Tone & Structure" section, update the "Rules" section to reference personalization fields, and add company_one_liner/personalization_hook to the "Contact" section
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.7_

  - [ ] 3.2 Extend OutreachDraftService with variant and personalization support
    - In `src/lib/services/outreach-draft-service.ts`, add `variantId?: string` to `OutreachDraftServiceDeps`
    - In `generate()`, look up the template variant using `getVariantById(variantId)` (falling back to DEFAULT_VARIANT_ID)
    - Read contact's `company_one_liner` and `personalization_hook` fields
    - Pass `variant_label`, `variant_tone_rules`, `variant_structure_notes`, `company_one_liner`, `personalization_hook` to `loadPromptTemplate`
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 3.2_

  - [ ]* 3.3 Write property tests for prompt construction (P3, P4)
    - **Property 3: Prompt construction includes all personalization data and variant rules**
    - **Property 4: Graceful generation with missing personalization fields**
    - Create test file `src/__tests__/properties/outreach-prompt.property.test.ts`
    - Mock LLMClient to capture the prompt string; verify prompt contains personalization fields and variant rules
    - Verify null personalization fields don't throw errors
    - **Validates: Requirements 2.1, 2.2, 2.6, 2.7, 3.2**

- [ ] 4. Checkpoint - Ensure data layer and service logic are correct
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. API layer: update existing endpoint and add bulk generation
  - [ ] 5.1 Update outreach generate request schema and route handler
    - In `src/lib/validation/outreach.ts`, add `variantId: z.string().optional()` to `outreachGenerateRequestSchema`
    - In `src/app/api/outreach/route.ts` POST handler, pass `variantId` from parsed body to `createOutreachDraftService`
    - _Requirements: 2.7, 3.2_

  - [ ] 5.2 Create bulk generation endpoint
    - Create `src/app/api/outreach/bulk/route.ts` with a POST handler
    - Define `outreachBulkGenerateRequestSchema` with `contactIds: z.array(z.string().uuid()).min(1).max(20)` and optional `variantId`
    - Iterate over contactIds sequentially, calling `OutreachDraftService.generate()` for each
    - Return a results array with per-contact success/failure status
    - _Requirements: 5.3, 5.4_

  - [ ]* 5.3 Write property tests for bulk generation (P9, P10)
    - **Property 9: Bulk generation produces one draft per contact**
    - **Property 10: Bulk generation rejects requests exceeding 20 contacts**
    - Create test file `src/__tests__/properties/bulk-generation.property.test.ts`
    - Mock LLMClient; test with random subsets of 1-20 contact IDs → exactly N drafts created
    - Test arrays of 21-100 UUIDs → validation error returned
    - **Validates: Requirements 5.3, 5.4**

- [ ] 6. Word counter utility and state machine validation
  - [ ] 6.1 Create word counter utility
    - Create a `countWords(text: string): number` and `countChars(text: string): number` utility (can be in `src/lib/utils/word-count.ts` or similar)
    - Word count: split by whitespace, filter empty tokens
    - _Requirements: 4.2_

  - [ ]* 6.2 Write property tests for word/char count and state machine (P7, P11)
    - **Property 7: Word and character count accuracy**
    - **Property 11: Outreach email state machine enforcement**
    - Create test file `src/__tests__/properties/word-count-state-machine.property.test.ts`
    - Random strings (including empty, whitespace-heavy, unicode) → verify word count matches split logic and char count matches string length
    - Cartesian product of all status pairs → verify `canTransition` returns true only for valid transitions
    - **Validates: Requirements 4.2, 6.1, 6.4, 7.1, 7.2**

- [ ] 7. UI components: VariantPicker, WordCounter, DraftReviewCard
  - [ ] 7.1 Create VariantPicker component
    - Create `src/components/outreach/VariantPicker.tsx`
    - Render a dropdown with all 4 template variant options from `TEMPLATE_VARIANTS`
    - On mount, read localStorage preference for the current `platform_source` and pre-select
    - On change, update localStorage preference via `setVariantForPlatform` and notify parent via `onChange` prop
    - _Requirements: 3.1, 3.3, 3.4_

  - [ ] 7.2 Create WordCounter component
    - Create `src/components/outreach/WordCounter.tsx`
    - Accept a `text: string` prop, display live word count and character count using the utility from 6.1
    - Style with appropriate warning color when over 120 words
    - _Requirements: 4.2_

  - [ ] 7.3 Create DraftReviewCard component with inline editing
    - Create `src/components/outreach/DraftReviewCard.tsx`
    - Render draft body in an editable textarea directly in the queue list
    - Include WordCounter below the textarea
    - Include Regenerate, Approve, and Reject action buttons
    - On blur or explicit save action, persist edits via PUT `/api/outreach/:id`
    - On Regenerate click, call POST `/api/outreach/:id/regenerate`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 8. UI components: BulkGenerateBar and FollowUpPrompt
  - [ ] 8.1 Create BulkGenerateBar component
    - Create `src/components/outreach/BulkGenerateBar.tsx`
    - Render select-all checkbox, count badge of selected contacts, and "Generate drafts for selected" button
    - Button enabled only when ≥1 contact is selected; shows error if >20 selected
    - Include progress indicator (X of N generated) during bulk operation
    - On click, call POST `/api/outreach/bulk` with selected contact IDs and active variantId
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.7_

  - [ ] 8.2 Create FollowUpPrompt component
    - Create `src/components/outreach/FollowUpPrompt.tsx`
    - Render a modal after marking an email as sent, prompting the user to set Follow_Up_Status on the associated application
    - Include options for follow-up statuses and a dismiss action
    - _Requirements: 6.2_

- [ ] 9. Integrate UI components into OutreachQueueView
  - [ ] 9.1 Update OutreachQueueView with new components
    - In `src/components/outreach/OutreachQueueView.tsx`, integrate `VariantPicker`, `BulkGenerateBar`, and `DraftReviewCard`
    - Replace existing DraftCard with new `DraftReviewCard` for inline editing
    - Add checkbox state management for bulk selection
    - Show VariantPicker above the generation controls
    - Move sent emails to a separate "Sent" section
    - _Requirements: 4.1, 5.1, 5.6, 6.3_

  - [ ] 9.2 Update contact form with new personalization fields
    - Find and update the contact form component to include editable inputs for `company_one_liner` (text input, 200 char max), `personalization_hook` (textarea, 500 char max), and `platform_source` (text input or dropdown)
    - _Requirements: 1.5_

  - [ ] 9.3 Wire FollowUpPrompt into the send flow
    - After a successful POST to `/api/outreach/:id/send`, display the `FollowUpPrompt` modal
    - On user selection, update the associated application's `followup_status` via the existing application update API
    - _Requirements: 6.1, 6.2, 6.4, 7.1, 7.2_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript, Next.js 14, better-sqlite3, Tailwind CSS, and Zod for validation
- The existing `OutreachDraftService` architecture and `LLMClient` are reused — no new LLM integration patterns needed
- All DB operations are synchronous via better-sqlite3
- Template variants are constants-driven (no new DB table)
- Variant preferences stored in localStorage (client-only)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2", "6.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "3.1"] },
    { "id": 2, "tasks": ["1.4", "2.3", "3.2"] },
    { "id": 3, "tasks": ["3.3", "5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "6.2", "7.1", "7.2"] },
    { "id": 5, "tasks": ["7.3", "8.1", "8.2"] },
    { "id": 6, "tasks": ["9.1", "9.2"] },
    { "id": 7, "tasks": ["9.3"] }
  ]
}
```
