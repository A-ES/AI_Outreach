import type { ContactCreateInput } from "@/lib/validation/schemas";

export interface ContactCsvPreviewRow {
  row_number: number;
  input: {
    name: string;
    company_name: string | null;
    role_title: string | null;
    email: string | null;
    linkedin_url: string | null;
  };
  status: "ready" | "duplicate" | "invalid";
  errors: string[];
}

const HEADER_MAP: Record<string, keyof ContactCsvPreviewRow["input"]> = {
  name: "name",
  company: "company_name",
  company_name: "company_name",
  role: "role_title",
  role_title: "role_title",
  email: "email",
  linkedin: "linkedin_url",
  linkedin_url: "linkedin_url",
  "linkedin url": "linkedin_url",
};

export function parseContactsCsv(csvText: string): ContactCsvPreviewRow[] {
  const rows = parseCsvRows(csvText).filter((row) =>
    row.some((cell) => cell.trim().length > 0)
  );
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => normalizeHeader(header));
  const seenInFile = new Set<string>();

  return rows.slice(1).map((row, index) => {
    const input = {
      name: "",
      company_name: null as string | null,
      role_title: null as string | null,
      email: null as string | null,
      linkedin_url: null as string | null,
    };

    headers.forEach((header, cellIndex) => {
      const key = HEADER_MAP[header];
      if (!key) return;
      const value = row[cellIndex]?.trim() ?? "";
      if (key === "name") {
        input.name = value;
      } else {
        input[key] = value || null;
      }
    });

    input.name = input.name ?? "";

    const errors: string[] = [];
    if (!input.name.trim()) errors.push("Name is required.");
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      errors.push("Email is invalid.");
    }
    if (input.linkedin_url && !/^https?:\/\/.+/i.test(input.linkedin_url)) {
      errors.push("LinkedIn URL must start with http:// or https://.");
    }
    if (input.email) {
      const email = input.email.toLowerCase();
      if (seenInFile.has(email)) errors.push("Duplicate email within this CSV.");
      seenInFile.add(email);
    }

    return {
      row_number: index + 2,
      input,
      status: errors.length > 0 ? "invalid" : "ready",
      errors,
    };
  });
}

export function toContactCreateInput(
  row: ContactCsvPreviewRow
): ContactCreateInput {
  return {
    name: row.input.name,
    company_name: row.input.company_name,
    role_title: row.input.role_title,
    email: row.input.email,
    linkedin_url: row.input.linkedin_url,
    status: "not_contacted",
  };
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[-_]+/g, " ");
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}
