import { readFileSync } from "fs";
import { join } from "path";

const PROMPTS_DIR = join(process.cwd(), "prompts");

/** Load a prompt template file from /prompts (e.g. "resume_match.md"). */
export function loadPrompt(filename: string): string {
  const path = join(PROMPTS_DIR, filename);
  return readFileSync(path, "utf-8");
}

/** Load and substitute {{placeholders}} in a prompt template. */
export function loadPromptTemplate(
  filename: string,
  variables: Record<string, string>
): string {
  let content = loadPrompt(filename);
  for (const [key, value] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}
