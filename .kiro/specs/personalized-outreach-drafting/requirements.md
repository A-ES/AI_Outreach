# Requirements Document

## Introduction

This feature upgrades the Outreach Queue's draft generation to support fast, semi-automated personalized email drafting. It expands the contact record with personalization fields, introduces template variants with different tones, enables bulk draft generation, and improves the review queue with inline editing, regeneration, and word counting. All drafts require manual review before sending — nothing auto-sends.

## Glossary

- **Draft_Generator**: The service that produces personalized outreach email drafts using the LLMClient (deepseek-v4-flash) and base resume content
- **Contact_Record**: A database record representing a person to reach out to, including name, company, role, and personalization fields
- **Review_Queue**: The UI section where generated drafts are displayed for editing, approval, and sending
- **Template_Variant**: A predefined tone/structure configuration (e.g. "Founder cold outreach", "Warm/referral intro") that controls the style of the generated draft
- **Personalization_Hook**: A one-sentence field on the contact record describing something specific to reference (a recent launch, product feature, mutual connection, or event)
- **Company_One_Liner**: A short free-text field on the contact record describing what the company builds (e.g. "AI agent for CI/CD debugging")
- **Base_Resume**: The resume marked with is_base_resume flag in the Resumes section, used as the source for project highlights during draft generation
- **Bulk_Draft_Generation**: The process of generating drafts for multiple selected contacts in a single batch operation
- **Word_Counter**: A UI element displaying the current word and character count of a draft body
- **Follow_Up_Status**: A field on the associated application indicating the current follow-up state (no_response, followed_up_once, followed_up_twice, ghosted)

## Requirements

### Requirement 1: Expanded Contact Record Fields

**User Story:** As a user, I want to store a company one-liner and personalization hook for each contact, so that the draft generator can produce highly personalized outreach emails.

#### Acceptance Criteria

1. THE Contact_Record SHALL include a `company_one_liner` field that accepts free-text input up to 200 characters
2. THE Contact_Record SHALL include a `personalization_hook` field that accepts free-text input up to 500 characters
3. THE Contact_Record SHALL include a `platform_source` field that stores the platform or source where the contact was found
4. WHEN a Contact_Record is created or updated, THE system SHALL persist the company_one_liner, personalization_hook, and platform_source fields to the SQLite database
5. WHEN the contact form is displayed, THE system SHALL render editable input fields for company_one_liner, personalization_hook, and platform_source alongside existing contact fields

### Requirement 2: Personalized Draft Generation

**User Story:** As a user, I want the draft generator to pull company one-liner and personalization hook into the opening sentences, so that each outreach email feels individually crafted.

#### Acceptance Criteria

1. WHEN "Generate draft" is triggered for a contact, THE Draft_Generator SHALL include the contact's company_one_liner in the opening 1-2 sentences of the generated email body
2. WHEN "Generate draft" is triggered for a contact, THE Draft_Generator SHALL include the contact's personalization_hook in the opening 1-2 sentences of the generated email body
3. WHEN "Generate draft" is triggered for a contact, THE Draft_Generator SHALL retrieve the Base_Resume and select 1-2 project highlights that match the company's focus area using the existing keyword-overlap retrieval
4. THE Draft_Generator SHALL produce drafts that follow this structure: opening hook (personalized) → 1-2 sentence relevant project pitch → clear low-friction ask → sign-off
5. THE Draft_Generator SHALL produce drafts with a body length of 120 words or fewer
6. WHEN a contact has no company_one_liner or personalization_hook populated, THE Draft_Generator SHALL still generate a draft using available contact fields (name, company_name, role_title)
7. THE Draft_Generator SHALL pass all contact personalization fields and the selected template variant to the LLM prompt

### Requirement 3: Template Variants

**User Story:** As a user, I want to choose a tone and structure before generating a draft, so that I can match the email style to the context of the outreach.

#### Acceptance Criteria

1. THE system SHALL provide a Template_Variant dropdown with the following options: "Founder cold outreach", "Warm/referral intro", "Job-posting follow-up", "Alumni/network ask"
2. WHEN a Template_Variant is selected and "Generate draft" is triggered, THE Draft_Generator SHALL use the tone and structure rules associated with that variant
3. THE system SHALL remember the last-used Template_Variant per platform_source and pre-select that variant when the same platform_source is used again
4. WHEN no previous variant selection exists for a platform_source, THE system SHALL default to "Founder cold outreach"

### Requirement 4: Inline Review Queue

**User Story:** As a user, I want to edit drafts directly in the review queue without opening a separate modal, so that I can quickly review and refine generated emails.

#### Acceptance Criteria

1. THE Review_Queue SHALL display the draft body in an editable text box directly within the queue list view
2. THE Review_Queue SHALL display a Word_Counter showing the current word count and character count of the draft body, updated in real time as the user types
3. THE Review_Queue SHALL include a "Regenerate" button adjacent to each draft that triggers re-generation without navigating away from the page
4. WHEN "Regenerate" is clicked, THE Draft_Generator SHALL produce a new draft using the same contact and template variant, replacing the current draft content in the editable text box
5. WHEN the user edits the draft body directly, THE system SHALL persist the changes to the outreach email record when the user moves focus away from the text box or clicks a save action

### Requirement 5: Bulk Draft Generation

**User Story:** As a user, I want to generate drafts for multiple contacts at once, so that I can efficiently prepare outreach for batches of prospects.

#### Acceptance Criteria

1. THE Review_Queue SHALL display a checkbox next to each contact in the queue list
2. THE system SHALL provide a "Generate drafts for selected" button that is enabled when at least one contact is checked
3. WHEN "Generate drafts for selected" is triggered, THE Draft_Generator SHALL generate individual drafts for each selected contact sequentially
4. THE system SHALL enforce a maximum of 20 contacts per Bulk_Draft_Generation request
5. IF a user selects more than 20 contacts and triggers bulk generation, THEN THE system SHALL display an error message indicating the 20-contact limit
6. WHEN Bulk_Draft_Generation completes, THE system SHALL display each generated draft as individually editable in the Review_Queue
7. WHILE Bulk_Draft_Generation is in progress, THE system SHALL display a progress indicator showing the number of drafts generated out of the total selected

### Requirement 6: Approve, Send, and Log

**User Story:** As a user, I want the system to timestamp and move approved emails to "Sent" status and prompt me to set follow-up status, so that I can track outreach progress without extra steps.

#### Acceptance Criteria

1. WHEN an outreach email is approved and marked as sent, THE system SHALL record the current timestamp in the date_sent field and transition the email status to "sent"
2. WHEN an outreach email transitions to "sent" status, THE system SHALL display a prompt asking the user to set the Follow_Up_Status on the associated application
3. WHEN an outreach email transitions to "sent" status, THE system SHALL move that email from the active review queue to a "Sent" section
4. THE system SHALL preserve the manual review step — no email transitions to "sent" status without explicit user approval first

### Requirement 7: Manual Review Enforcement

**User Story:** As a user, I want the guarantee that no outreach email is ever sent automatically, so that I always have full control over what goes out.

#### Acceptance Criteria

1. THE system SHALL require explicit user approval before any outreach email can transition from "draft" to "approved" status
2. THE system SHALL require explicit user action to mark an approved email as "sent"
3. THE Draft_Generator SHALL produce outputs only with "draft" status and never directly create emails in "approved" or "sent" status
