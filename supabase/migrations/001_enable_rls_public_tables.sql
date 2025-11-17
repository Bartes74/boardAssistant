-- Enable Row Level Security for publicly exposed tables and add baseline policies

ALTER TABLE IF EXISTS "Source" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "RawDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Topic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ChunkEmbedding" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'Source' AND policyname = 'source_select_policy'
  ) THEN
    CREATE POLICY source_select_policy ON "Source"
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'Source' AND policyname = 'source_write_policy'
  ) THEN
    CREATE POLICY source_write_policy ON "Source"
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
    CREATE POLICY source_update_policy ON "Source"
      FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    CREATE POLICY source_delete_policy ON "Source"
      FOR DELETE USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'RawDocument' AND policyname = 'rawdocument_select_policy'
  ) THEN
    CREATE POLICY rawdocument_select_policy ON "RawDocument"
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'RawDocument' AND policyname = 'rawdocument_write_policy'
  ) THEN
    CREATE POLICY rawdocument_write_policy ON "RawDocument"
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
    CREATE POLICY rawdocument_update_policy ON "RawDocument"
      FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    CREATE POLICY rawdocument_delete_policy ON "RawDocument"
      FOR DELETE USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'Document' AND policyname = 'document_select_policy'
  ) THEN
    CREATE POLICY document_select_policy ON "Document"
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'Document' AND policyname = 'document_write_policy'
  ) THEN
    CREATE POLICY document_write_policy ON "Document"
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
    CREATE POLICY document_update_policy ON "Document"
      FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    CREATE POLICY document_delete_policy ON "Document"
      FOR DELETE USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'Topic' AND policyname = 'topic_select_policy'
  ) THEN
    CREATE POLICY topic_select_policy ON "Topic"
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'Topic' AND policyname = 'topic_write_policy'
  ) THEN
    CREATE POLICY topic_write_policy ON "Topic"
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
    CREATE POLICY topic_update_policy ON "Topic"
      FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    CREATE POLICY topic_delete_policy ON "Topic"
      FOR DELETE USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ChunkEmbedding' AND policyname = 'chunkembedding_select_policy'
  ) THEN
    CREATE POLICY chunkembedding_select_policy ON "ChunkEmbedding"
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ChunkEmbedding' AND policyname = 'chunkembedding_write_policy'
  ) THEN
    CREATE POLICY chunkembedding_write_policy ON "ChunkEmbedding"
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
    CREATE POLICY chunkembedding_delete_policy ON "ChunkEmbedding"
      FOR DELETE USING (auth.role() = 'service_role');
  END IF;
END $$;


