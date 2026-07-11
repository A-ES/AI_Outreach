-- Incremental update: ATS parseability check history

CREATE TABLE ats_check_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  overall_pass boolean NOT NULL,
  checks jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ats_check_results_user_id_idx ON ats_check_results(user_id);
CREATE INDEX ats_check_results_resume_id_idx ON ats_check_results(resume_id);
CREATE INDEX ats_check_results_created_at_idx ON ats_check_results(user_id, created_at DESC);

ALTER TABLE ats_check_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY ats_check_results_select ON ats_check_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ats_check_results_insert ON ats_check_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON TABLE ats_check_results TO authenticated;
