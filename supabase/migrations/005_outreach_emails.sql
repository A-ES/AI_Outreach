-- Phase 5: Outreach email drafts and review queue

CREATE TABLE outreach_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'sent', 'rejected')),
  date_drafted timestamptz NOT NULL DEFAULT now(),
  date_sent timestamptz,
  reply_received boolean NOT NULL DEFAULT false,
  outcome text CHECK (
    outcome IN ('no_reply', 'positive', 'rejection', 'interview_request')
    OR outcome IS NULL
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outreach_emails_user_id_idx ON outreach_emails(user_id);
CREATE INDEX outreach_emails_contact_id_idx ON outreach_emails(contact_id);
CREATE INDEX outreach_emails_status_idx ON outreach_emails(user_id, status);

CREATE TRIGGER outreach_emails_updated_at
  BEFORE UPDATE ON outreach_emails
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE outreach_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY outreach_emails_select ON outreach_emails
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY outreach_emails_insert ON outreach_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY outreach_emails_update ON outreach_emails
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY outreach_emails_delete ON outreach_emails
  FOR DELETE USING (auth.uid() = user_id);

-- Grant DML privileges to the authenticated role so RLS policies can run
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE outreach_emails TO authenticated;
