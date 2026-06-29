"use client";

import type { ResumeContent } from "@/lib/validation/resume";

interface ResumeStructuredEditorProps {
  content: ResumeContent;
  onChange: (content: ResumeContent) => void;
}

export function ResumeStructuredEditor({
  content,
  onChange,
}: ResumeStructuredEditorProps) {
  return (
    <div className="space-y-6">
      <Section
        title="Experience"
        onAdd={() =>
          onChange({
            ...content,
            experience: [
              ...content.experience,
              { title: "", company: "", dates: "", bullets: [""] },
            ],
          })
        }
      >
        {content.experience.map((entry, i) => (
          <EntryCard
            key={i}
            onRemove={() =>
              onChange({
                ...content,
                experience: content.experience.filter((_, idx) => idx !== i),
              })
            }
          >
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                placeholder="Title"
                value={entry.title}
                onChange={(e) => {
                  const experience = [...content.experience];
                  experience[i] = { ...entry, title: e.target.value };
                  onChange({ ...content, experience });
                }}
                className="input-field"
              />
              <input
                placeholder="Company"
                value={entry.company}
                onChange={(e) => {
                  const experience = [...content.experience];
                  experience[i] = { ...entry, company: e.target.value };
                  onChange({ ...content, experience });
                }}
                className="input-field"
              />
              <input
                placeholder="Dates"
                value={entry.dates}
                onChange={(e) => {
                  const experience = [...content.experience];
                  experience[i] = { ...entry, dates: e.target.value };
                  onChange({ ...content, experience });
                }}
                className="input-field"
              />
            </div>
            <BulletList
              bullets={entry.bullets}
              onChange={(bullets) => {
                const experience = [...content.experience];
                experience[i] = { ...entry, bullets };
                onChange({ ...content, experience });
              }}
            />
          </EntryCard>
        ))}
      </Section>

      <Section
        title="Projects"
        onAdd={() =>
          onChange({
            ...content,
            projects: [...content.projects, { name: "", bullets: [""] }],
          })
        }
      >
        {content.projects.map((entry, i) => (
          <EntryCard
            key={i}
            onRemove={() =>
              onChange({
                ...content,
                projects: content.projects.filter((_, idx) => idx !== i),
              })
            }
          >
            <input
              placeholder="Project name"
              value={entry.name}
              onChange={(e) => {
                const projects = [...content.projects];
                projects[i] = { ...entry, name: e.target.value };
                onChange({ ...content, projects });
              }}
              className="input-field"
            />
            <BulletList
              bullets={entry.bullets ?? [""]}
              onChange={(bullets) => {
                const projects = [...content.projects];
                projects[i] = { ...entry, bullets };
                onChange({ ...content, projects });
              }}
            />
          </EntryCard>
        ))}
      </Section>

      <Section
        title="Education"
        onAdd={() =>
          onChange({
            ...content,
            education: [...content.education, { degree: "", school: "", dates: "" }],
          })
        }
      >
        {content.education.map((entry, i) => (
          <EntryCard
            key={i}
            onRemove={() =>
              onChange({
                ...content,
                education: content.education.filter((_, idx) => idx !== i),
              })
            }
          >
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                placeholder="Degree"
                value={entry.degree}
                onChange={(e) => {
                  const education = [...content.education];
                  education[i] = { ...entry, degree: e.target.value };
                  onChange({ ...content, education });
                }}
                className="input-field"
              />
              <input
                placeholder="School"
                value={entry.school}
                onChange={(e) => {
                  const education = [...content.education];
                  education[i] = { ...entry, school: e.target.value };
                  onChange({ ...content, education });
                }}
                className="input-field"
              />
              <input
                placeholder="Dates"
                value={entry.dates ?? ""}
                onChange={(e) => {
                  const education = [...content.education];
                  education[i] = { ...entry, dates: e.target.value };
                  onChange({ ...content, education });
                }}
                className="input-field"
              />
            </div>
          </EntryCard>
        ))}
      </Section>

      <Section
        title="Skills"
        onAdd={() => onChange({ ...content, skills: [...content.skills, ""] })}
      >
        <div className="space-y-2">
          {content.skills.map((skill, i) => (
            <div key={i} className="flex gap-2">
              <input
                placeholder="Skill"
                value={skill}
                onChange={(e) => {
                  const skills = [...content.skills];
                  skills[i] = e.target.value;
                  onChange({ ...content, skills });
                }}
                className="input-field"
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...content,
                    skills: content.skills.filter((_, idx) => idx !== i),
                  })
                }
                className="btn-secondary shrink-0 px-3"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <button type="button" onClick={onAdd} className="caption text-accent hover:underline">
          + Add
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EntryCard({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-card border border-border bg-surface p-3">
      {children}
      <button type="button" onClick={onRemove} className="caption text-red-600 hover:underline">
        Remove entry
      </button>
    </div>
  );
}

function BulletList({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (bullets: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {bullets.map((bullet, i) => (
        <div key={i} className="flex gap-2">
          <input
            placeholder="Bullet point"
            value={bullet}
            onChange={(e) => {
              const next = [...bullets];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="input-field"
          />
          <button
            type="button"
            onClick={() => onChange(bullets.filter((_, idx) => idx !== i))}
            className="btn-secondary shrink-0 px-3"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...bullets, ""])}
        className="caption text-accent hover:underline"
      >
        + Add bullet
      </button>
    </div>
  );
}
