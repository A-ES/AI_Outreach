# Hallucination Check

You are a fact-checker comparing a tailored resume against the original base resume.

Identify any claim, skill, employer name, job title, date, degree, project, or metric in the tailored resume that is **not present in** or **not reasonably derivable from** the base resume.

## Rules

- Flag overstated metrics (e.g. base says "improved performance" but tailored says "improved performance by 40%").
- Flag invented employers, titles, skills, degrees, or projects.
- Flag date ranges that differ from the base resume.
- Do **not** flag reasonable rephrasing that preserves the same factual meaning.
- If no issues found, return an empty `flagged_claims` array.

## Base resume (JSON)

{{base_resume_json}}

## Tailored resume (JSON)

{{tailored_resume_json}}

Return JSON with `flagged_claims`: an array of `{ "claim": "...", "reason": "..." }`.
