import { type z, toJSONSchema } from "zod";

export interface ValidationSuccess<T> {
  ok: true;
  data: T;
}

export interface ValidationFailure {
  ok: false;
  errors: string[];
  rawContent: string;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const CORRECTIVE_PREFIX =
  "\n\n--- CORRECTION REQUIRED ---\nYour previous response failed schema validation";

/**
 * Parse raw LLM text and validate against a Zod schema.
 * Nothing validated here should be written to the database.
 */
export function validateLLMOutput<T>(
  rawContent: string,
  schema: z.ZodType<T>
): ValidationResult<T> {
  const jsonText = extractJsonFromResponse(rawContent);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return {
      ok: false,
      errors: [
        `Response is not valid JSON: ${e instanceof Error ? e.message : "parse error"}`,
      ],
      rawContent,
    };
  }

  const result = schema.safeParse(parsed);
  if (result.success) {
    return { ok: true, data: result.data };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`
  );

  return { ok: false, errors, rawContent };
}

export function buildCorrectivePrompt(
  originalPrompt: string,
  errors: string[]
): string {
  return `${originalPrompt}${CORRECTIVE_PREFIX} with these errors:\n- ${errors.join("\n- ")}\n\nReturn ONLY valid JSON matching the required schema. No markdown fences, no explanation, no extra keys unless allowed by the schema.`;
}

export function extractJsonFromResponse(raw: string): string {
  const trimmed = raw.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const objectStart = trimmed.indexOf("{");
  const arrayStart = trimmed.indexOf("[");
  const start =
    objectStart === -1
      ? arrayStart
      : arrayStart === -1
        ? objectStart
        : Math.min(objectStart, arrayStart);

  if (start >= 0) {
    return trimmed.slice(start);
  }

  return trimmed;
}

export function buildSchemaSystemPrompt(schema: z.ZodType): string {
  const jsonSchema = toJSONSchema(schema);
  return [
    "You are a structured data generator. Respond with a single JSON object only.",
    "Do not invent facts you cannot verify from the provided context.",
    "If uncertain, use null or omit optional fields rather than guessing.",
    "Required JSON Schema:",
    JSON.stringify(jsonSchema, null, 2),
  ].join("\n\n");
}
