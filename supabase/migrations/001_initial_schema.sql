-- Job Search Command Center — Phase 1 schema

-- Applications
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  role_title text NOT NULL,
  job_description_text text,
  status text NOT NULL DEFAULT 'saved'
    CHECK (status IN ('saved','applied','interviewing','offer','rejected','ghosted')),
  date_applied date,
  date_status_changed date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX applications_user_id_idx ON applications(user_id);
CREATE INDEX applications_status_idx ON applications(user_id, status);

-- Contacts (application_id optional — more FKs will reference applications in later phases)
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  name text NOT NULL,
  company_name text,
  role_title text,
  email text,
  linkedin_url text,
  status text NOT NULL DEFAULT 'not_contacted'
    CHECK (status IN ('not_contacted','drafted','sent','replied','no_response')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contacts_user_id_idx ON contacts(user_id);
CREATE INDEX contacts_application_id_idx ON contacts(application_id);

-- Weekly goals
CREATE TABLE weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  target_applications int NOT NULL DEFAULT 0,
  target_interviews int NOT NULL DEFAULT 0,
  actual_applications int NOT NULL DEFAULT 0,
  actual_interviews int NOT NULL DEFAULT 0,
  UNIQUE (user_id, week_start_date)
);

CREATE INDEX weekly_goals_user_id_idx ON weekly_goals(user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Recalculate weekly goal actuals for a user
CREATE OR REPLACE FUNCTION recalculate_weekly_goals(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE weekly_goals wg
  SET
    actual_applications = (
      SELECT COUNT(*)::int
      FROM applications a
      WHERE a.user_id = p_user_id
        AND a.date_applied IS NOT NULL
        AND a.date_applied >= wg.week_start_date
        AND a.date_applied < wg.week_start_date + 7
        AND a.status IN ('applied','interviewing','offer','rejected','ghosted')
    ),
    actual_interviews = (
      SELECT COUNT(*)::int
      FROM applications a
      WHERE a.user_id = p_user_id
        AND a.date_status_changed IS NOT NULL
        AND a.date_status_changed >= wg.week_start_date
        AND a.date_status_changed < wg.week_start_date + 7
        AND a.status IN ('interviewing','offer')
    )
  WHERE wg.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION trigger_recalculate_weekly_goals()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_weekly_goals(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_weekly_goals(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER applications_recalculate_goals
  AFTER INSERT OR UPDATE OR DELETE ON applications
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_weekly_goals();

-- Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY applications_select ON applications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY applications_insert ON applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY applications_update ON applications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY applications_delete ON applications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY contacts_select ON contacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY contacts_insert ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY contacts_update ON contacts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY contacts_delete ON contacts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY weekly_goals_select ON weekly_goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY weekly_goals_insert ON weekly_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY weekly_goals_update ON weekly_goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY weekly_goals_delete ON weekly_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Grant DML privileges to the authenticated role so RLS policies can run
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE applications  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE contacts      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE weekly_goals  TO authenticated;
