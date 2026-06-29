-- Phase 4: Structured resume storage and tailoring

CREATE TABLE resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_label text NOT NULL,
  content_json jsonb NOT NULL,
  is_base_resume boolean NOT NULL DEFAULT false,
  tailored_for_application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX resumes_user_id_idx ON resumes(user_id);
CREATE INDEX resumes_base_idx ON resumes(user_id, is_base_resume) WHERE is_base_resume = true;
CREATE INDEX resumes_application_idx ON resumes(tailored_for_application_id);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY resumes_select ON resumes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY resumes_insert ON resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY resumes_update ON resumes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY resumes_delete ON resumes
  FOR DELETE USING (auth.uid() = user_id);

-- Grant DML privileges to the authenticated role so RLS policies can run
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE resumes TO authenticated;

-- Link resume_match_results to resumes now that the table exists
ALTER TABLE resume_match_results
  ADD CONSTRAINT resume_match_results_resume_id_fkey
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;
