-- RLS isolation test (run manually in Supabase SQL Editor)
--
-- Prerequisites:
-- 1. Run 001_initial_schema.sql
-- 2. Create two auth users via the app (User A and User B)
-- 3. Insert one application for User A via the app UI
-- 4. Replace USER_A_ID and USER_B_ID below with UUIDs from auth.users

-- As User A: should see >= 1 application
-- SET LOCAL role authenticated;
-- SELECT set_config('request.jwt.claims', json_build_object('sub', 'USER_A_ID')::text, true);
-- SELECT id, company_name FROM applications;

-- As User B: should NOT see User A's application
-- SELECT set_config('request.jwt.claims', json_build_object('sub', 'USER_B_ID')::text, true);
-- SELECT id, company_name FROM applications;

-- Direct insert as User B referencing User A's application_id should fail RLS on contacts:
-- INSERT INTO contacts (user_id, application_id, name)
-- VALUES ('USER_B_ID', 'USER_A_APPLICATION_ID', 'Should Fail');
