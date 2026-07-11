import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs"); // eslint-disable-line @typescript-eslint/no-require-imports
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      company_name TEXT NOT NULL,
      role_title TEXT NOT NULL,
      platform TEXT,
      application_url TEXT,
      contact_id TEXT,
      job_description_text TEXT,
      followup_status TEXT,
      status TEXT NOT NULL DEFAULT 'saved',
      date_applied TEXT,
      date_status_changed TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      company_name TEXT,
      role_title TEXT,
      email TEXT,
      linkedin_url TEXT,
      status TEXT NOT NULL DEFAULT 'not_contacted',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weekly_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      week_start_date TEXT NOT NULL,
      target_applications INTEGER NOT NULL DEFAULT 0,
      target_interviews INTEGER NOT NULL DEFAULT 0,
      actual_applications INTEGER NOT NULL DEFAULT 0,
      actual_interviews INTEGER NOT NULL DEFAULT 0,
      UNIQUE (user_id, week_start_date)
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      version_label TEXT NOT NULL,
      content_json TEXT NOT NULL,
      is_base_resume INTEGER NOT NULL DEFAULT 0,
      tailored_for_application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_call_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      feature_name TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      model_name TEXT NOT NULL,
      temperature REAL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      confidence_score REAL,
      validation_passed INTEGER NOT NULL DEFAULT 0,
      validation_retry_count INTEGER NOT NULL DEFAULT 0,
      raw_response_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resume_match_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
      resume_id TEXT REFERENCES resumes(id) ON DELETE SET NULL,
      match_score INTEGER NOT NULL,
      matched_keywords TEXT NOT NULL DEFAULT '[]',
      missing_keywords TEXT NOT NULL DEFAULT '[]',
      reasoning_trace TEXT NOT NULL DEFAULT '[]',
      confidence_label TEXT NOT NULL,
      confidence_reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS outreach_emails (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
      subject TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      date_drafted TEXT NOT NULL DEFAULT (datetime('now')),
      date_sent TEXT,
      reply_received INTEGER NOT NULL DEFAULT 0,
      outcome TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ats_check_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      resume_id TEXT REFERENCES resumes(id) ON DELETE SET NULL,
      overall_pass INTEGER NOT NULL,
      checks TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS eval_test_cases (
      id TEXT PRIMARY KEY,
      job_description_text TEXT NOT NULL,
      expected_keywords TEXT NOT NULL,
      expected_missing_skills TEXT NOT NULL,
      expected_match_range_min INTEGER NOT NULL,
      expected_match_range_max INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS eval_run_results (
      id TEXT PRIMARY KEY,
      eval_test_case_id TEXT REFERENCES eval_test_cases(id) ON DELETE CASCADE,
      run_timestamp TEXT DEFAULT (datetime('now')),
      actual_match_score INTEGER NOT NULL,
      keyword_precision REAL NOT NULL,
      keyword_recall REAL NOT NULL,
      passed INTEGER NOT NULL,
      notes TEXT
    );
  `);

  // Add columns if missing (for existing databases)
  const cols = db.prepare("PRAGMA table_info(applications)").all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has("platform")) {
    db.exec("ALTER TABLE applications ADD COLUMN platform TEXT");
  }
  if (!colNames.has("application_url")) {
    db.exec("ALTER TABLE applications ADD COLUMN application_url TEXT");
  }
  if (!colNames.has("contact_id")) {
    db.exec("ALTER TABLE applications ADD COLUMN contact_id TEXT");
  }
  if (!colNames.has("followup_status")) {
    db.exec("ALTER TABLE applications ADD COLUMN followup_status TEXT");
  }
}
