-- Phase 3: Resume match results
-- resume_id is nullable until Phase 4 adds a resumes table

CREATE TABLE resume_match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  resume_id uuid,
  match_score int NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  matched_keywords jsonb NOT NULL DEFAULT '[]',
  missing_keywords jsonb NOT NULL DEFAULT '[]',
  reasoning_trace jsonb NOT NULL DEFAULT '[]',
  confidence_label text NOT NULL CHECK (confidence_label IN ('high', 'medium', 'low')),
  confidence_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX resume_match_results_user_id_idx ON resume_match_results(user_id);
CREATE INDEX resume_match_results_application_id_idx ON resume_match_results(application_id);

ALTER TABLE resume_match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY resume_match_results_select ON resume_match_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY resume_match_results_insert ON resume_match_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY resume_match_results_delete ON resume_match_results
  FOR DELETE USING (auth.uid() = user_id);

-- Grant DML privileges to the authenticated role so RLS policies can run
GRANT SELECT, INSERT, DELETE ON TABLE resume_match_results TO authenticated;
