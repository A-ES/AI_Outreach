/**
 * Lightweight resume content retrieval via keyword overlap scoring.
 *
 * This is NOT vector/semantic search — it tokenizes contact role keywords and
 * ranks resume bullets/projects by simple word overlap. Sufficient for Phase 5;
 * replace with embeddings later if needed.
 */

import type { ResumeContent } from "@/lib/validation/resume";

export interface RetrievedHighlight {
  text: string;
  section: "experience" | "project" | "skill";
  score: number;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "at", "in", "of", "for", "to", "with",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might",
  "on", "by", "as", "from", "that", "this", "it", "their", "they", "we", "our",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#.]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function overlapScore(queryTokens: string[], text: string): number {
  const textTokens = new Set(tokenize(text));
  if (queryTokens.length === 0) return 0;
  let hits = 0;
  for (const token of queryTokens) {
    if (textTokens.has(token)) hits += 1;
  }
  return hits / queryTokens.length;
}

export function retrieveRelevantHighlights(
  resume: ResumeContent,
  context: {
    contactRole?: string | null;
    contactCompany?: string | null;
    applicationRole?: string | null;
    applicationCompany?: string | null;
  },
  limit = 6
): RetrievedHighlight[] {
  const queryText = [
    context.contactRole,
    context.contactCompany,
    context.applicationRole,
    context.applicationCompany,
  ]
    .filter(Boolean)
    .join(" ");

  const queryTokens = tokenize(queryText);
  const candidates: RetrievedHighlight[] = [];

  for (const exp of resume.experience) {
    const header = `${exp.title} ${exp.company} ${exp.dates}`;
    candidates.push({
      text: `${header}: ${exp.bullets.join("; ")}`,
      section: "experience",
      score: overlapScore(queryTokens, `${header} ${exp.bullets.join(" ")}`),
    });
    for (const bullet of exp.bullets) {
      candidates.push({
        text: bullet,
        section: "experience",
        score: overlapScore(queryTokens, `${exp.title} ${exp.company} ${bullet}`),
      });
    }
  }

  for (const project of resume.projects) {
    const text = `${project.name} ${project.description ?? ""} ${(project.bullets ?? []).join(" ")}`;
    candidates.push({
      text: project.bullets?.length
        ? `${project.name}: ${project.bullets.join("; ")}`
        : project.name,
      section: "project",
      score: overlapScore(queryTokens, text),
    });
  }

  for (const skill of resume.skills) {
    candidates.push({
      text: skill,
      section: "skill",
      score: overlapScore(queryTokens, skill),
    });
  }

  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((c) => {
      if (c.score <= 0 && queryTokens.length > 0) return false;
      if (seen.has(c.text)) return false;
      seen.add(c.text);
      return true;
    })
    .slice(0, limit);
}

export function formatHighlightsForPrompt(highlights: RetrievedHighlight[]): string {
  if (highlights.length === 0) {
    return "No keyword-matched highlights found. Use general professional tone without inventing specifics.";
  }
  return highlights
    .map((h, i) => `${i + 1}. [${h.section}] ${h.text}`)
    .join("\n");
}
