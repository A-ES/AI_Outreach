-- Phase 2: AI call logging

CREATE TABLE ai_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  prompt_text text NOT NULL,
  model_name text NOT NULL,
  temperature float,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  latency_ms int NOT NULL DEFAULT 0,
  confidence_score float,
  validation_passed boolean NOT NULL DEFAULT false,
  validation_retry_count int NOT NULL DEFAULT 0,
  raw_response_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_call_logs_user_id_idx ON ai_call_logs(user_id);
CREATE INDEX ai_call_logs_feature_name_idx ON ai_call_logs(user_id, feature_name);
CREATE INDEX ai_call_logs_created_at_idx ON ai_call_logs(user_id, created_at DESC);

ALTER TABLE ai_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_call_logs_select ON ai_call_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ai_call_logs_insert ON ai_call_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant DML privileges to the authenticated role so RLS policies can run
GRANT SELECT, INSERT ON TABLE ai_call_logs TO authenticated;
