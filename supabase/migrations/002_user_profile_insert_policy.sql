-- Allow authenticated users to create their own profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'UserProfile'
      AND policyname = 'user_profile_insert'
  ) THEN
    CREATE POLICY user_profile_insert ON "UserProfile"
      FOR INSERT
      WITH CHECK ("user_id" = auth.uid());
  END IF;
END $$;

-- Allow authenticated users to select their profile even if it needs to be lazily created

