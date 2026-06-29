# Prompt templates

Each AI feature (Phases 3–6) gets its own prompt file here, e.g.:

- `resume_match.md`
- `outreach_email.md`
- `interview_prep.md`

Prompts are loaded via `loadPrompt()` / `loadPromptTemplate()` from `src/lib/llm/prompt-loader.ts` — never inlined as giant strings in service code.

Use `{{variable}}` placeholders for dynamic sections.
