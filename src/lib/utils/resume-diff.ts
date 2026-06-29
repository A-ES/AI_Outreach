import type { ResumeContent } from "@/lib/validation/resume";

export type DiffKind = "unchanged" | "added" | "removed" | "changed";

export interface ResumeDiffLine {
  kind: DiffKind;
  section: string;
  label: string;
  base: string | null;
  tailored: string | null;
}

function formatExperience(entry: ResumeContent["experience"][0]): string[] {
  const lines = [`${entry.title} @ ${entry.company} (${entry.dates})`];
  entry.bullets.forEach((b) => lines.push(`  • ${b}`));
  return lines;
}

function formatProject(entry: ResumeContent["projects"][0]): string[] {
  const lines = [entry.name];
  if (entry.description) lines.push(`  ${entry.description}`);
  entry.bullets?.forEach((b) => lines.push(`  • ${b}`));
  return lines;
}

function formatEducation(entry: ResumeContent["education"][0]): string {
  return `${entry.degree}, ${entry.school}${entry.dates ? ` (${entry.dates})` : ""}`;
}

function diffStringLists(
  section: string,
  labelPrefix: string,
  baseItems: string[],
  tailoredItems: string[]
): ResumeDiffLine[] {
  const lines: ResumeDiffLine[] = [];
  const maxLen = Math.max(baseItems.length, tailoredItems.length);

  for (let i = 0; i < maxLen; i++) {
    const base = baseItems[i] ?? null;
    const tailored = tailoredItems[i] ?? null;
    const label = `${labelPrefix} ${i + 1}`;

    if (base === tailored) {
      if (base) lines.push({ kind: "unchanged", section, label, base, tailored });
    } else if (base && tailored) {
      lines.push({ kind: "changed", section, label, base, tailored });
    } else if (base && !tailored) {
      lines.push({ kind: "removed", section, label, base, tailored: null });
    } else if (!base && tailored) {
      lines.push({ kind: "added", section, label, base: null, tailored });
    }
  }

  return lines;
}

/** Produce a flat list of diff lines for side-by-side display. */
export function diffResumeContent(
  base: ResumeContent,
  tailored: ResumeContent
): ResumeDiffLine[] {
  const lines: ResumeDiffLine[] = [];

  const baseExp = base.experience.flatMap((e, i) =>
    formatExperience(e).map((l) => ({ label: `Experience ${i + 1}`, line: l }))
  );
  const tailoredExp = tailored.experience.flatMap((e, i) =>
    formatExperience(e).map((l) => ({ label: `Experience ${i + 1}`, line: l }))
  );
  lines.push(
    ...pairwiseDiff(
      "Experience",
      baseExp.map((x) => x.line),
      tailoredExp.map((x) => x.line)
    )
  );

  const baseProj = base.projects.flatMap((p, i) =>
    formatProject(p).map((l) => ({ label: `Project ${i + 1}`, line: l }))
  );
  const tailoredProj = tailored.projects.flatMap((p, i) =>
    formatProject(p).map((l) => ({ label: `Project ${i + 1}`, line: l }))
  );
  lines.push(
    ...pairwiseDiff(
      "Projects",
      baseProj.map((x) => x.line),
      tailoredProj.map((x) => x.line)
    )
  );

  lines.push(
    ...diffStringLists(
      "Education",
      "Entry",
      base.education.map(formatEducation),
      tailored.education.map(formatEducation)
    )
  );

  lines.push(
    ...diffStringLists("Skills", "Skill", base.skills, tailored.skills)
  );

  return lines;
}

function pairwiseDiff(
  section: string,
  baseLines: string[],
  tailoredLines: string[]
): ResumeDiffLine[] {
  const result: ResumeDiffLine[] = [];
  const maxLen = Math.max(baseLines.length, tailoredLines.length);

  for (let i = 0; i < maxLen; i++) {
    const base = baseLines[i] ?? null;
    const tailored = tailoredLines[i] ?? null;
    const label = `${section} line ${i + 1}`;

    if (base === tailored) {
      if (base) result.push({ kind: "unchanged", section, label, base, tailored });
    } else if (base && tailored) {
      result.push({ kind: "changed", section, label, base, tailored });
    } else if (base) {
      result.push({ kind: "removed", section, label, base, tailored: null });
    } else if (tailored) {
      result.push({ kind: "added", section, label, base: null, tailored });
    }
  }

  return result;
}

export function hasVisibleChanges(lines: ResumeDiffLine[]): boolean {
  return lines.some((l) => l.kind !== "unchanged");
}
