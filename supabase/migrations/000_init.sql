-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Enumerations
DO $$ BEGIN
  CREATE TYPE "SourceType" AS ENUM ('rss','api','html','pdf','internal_dms','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentStatus" AS ENUM ('new','updated','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TopicStatus" AS ENUM ('new','growing','stable','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('BOARD_MEMBER','ADMIN','SECURITY_OFFICER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "Source" (
  "source_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" "SourceType" NOT NULL,
  "name" text NOT NULL,
  "base_url" text,
  "auth_config" jsonb,
  "default_language" text,
  "refresh_interval" integer,
  "last_fetched_at" timestamptz,
  "active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "RawDocument" (
  "raw_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_id" uuid NOT NULL REFERENCES "Source"("source_id") ON DELETE CASCADE,
  "fetched_at" timestamptz NOT NULL,
  "raw_location" text NOT NULL,
  "content_hash" text,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Topic" (
  "topic_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text,
  "created_at" timestamptz DEFAULT now(),
  "last_event_at" timestamptz,
  "topic_status" "TopicStatus" DEFAULT 'new',
  "tags" jsonb,
  "centroid_embedding" vector(768)
);

CREATE TABLE IF NOT EXISTS "Document" (
  "doc_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_id" uuid NOT NULL REFERENCES "Source"("source_id") ON DELETE CASCADE,
  "canonical_url" text UNIQUE,
  "title" text NOT NULL,
  "author" text,
  "published_at" timestamptz,
  "ingested_at" timestamptz DEFAULT now(),
  "lang" text,
  "doc_type" text,
  "summary" text,
  "status" "DocumentStatus" DEFAULT 'new',
  "topic_id" uuid REFERENCES "Topic"("topic_id"),
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ChunkEmbedding" (
  "chunk_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "doc_id" uuid NOT NULL REFERENCES "Document"("doc_id") ON DELETE CASCADE,
  "chunk_index" integer NOT NULL,
  "text" text NOT NULL,
  "embedding" vector(768) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "UserProfile" (
  "user_id" uuid PRIMARY KEY,
  "role" "UserRole" NOT NULL,
  "email" text,
  "regions" text[] NOT NULL DEFAULT '{}',
  "industries" text[] NOT NULL DEFAULT '{}',
  "competitors_watchlist" text[] NOT NULL DEFAULT '{}',
  "keywords_include" text[] NOT NULL DEFAULT '{}',
  "keywords_exclude" text[] NOT NULL DEFAULT '{}',
  "detail_level" text NOT NULL DEFAULT 'medium',
  "response_style" jsonb NOT NULL DEFAULT '{"length":"short","format":"bullets","language":"pl"}',
  "language" text NOT NULL DEFAULT 'pl',
  "source_prefs" jsonb,
  "settings" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "UserTopicScore" (
  "user_id" uuid NOT NULL REFERENCES "UserProfile"("user_id") ON DELETE CASCADE,
  "topic_id" uuid NOT NULL REFERENCES "Topic"("topic_id") ON DELETE CASCADE,
  "score" double precision NOT NULL DEFAULT 0,
  "last_seen_at" timestamptz,
  "interactions_count" integer NOT NULL DEFAULT 0,
  "pinned" boolean NOT NULL DEFAULT false,
  "hidden" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  PRIMARY KEY ("user_id","topic_id")
);

CREATE TABLE IF NOT EXISTS "UserQueryLog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "UserProfile"("user_id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "response_summary" text,
  "topic_ids" uuid[] NOT NULL DEFAULT '{}',
  "from_date" timestamptz,
  "to_date" timestamptz,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "UserRecommendation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "UserProfile"("user_id") ON DELETE CASCADE,
  "topic_id" uuid REFERENCES "Topic"("topic_id"),
  "title" text NOT NULL,
  "actions" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "expires_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_id" uuid,
  "actor_role" "UserRole",
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" uuid,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "documents_topic_id_idx" ON "Document"("topic_id");
CREATE INDEX IF NOT EXISTS "chunk_embeddings_doc_idx" ON "ChunkEmbedding"("doc_id","chunk_index");

-- RLS policies using Supabase auth.uid()
ALTER TABLE "UserProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserTopicScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserQueryLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profile_select" ON "UserProfile"
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_profile_update" ON "UserProfile"
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_topic_score_access" ON "UserTopicScore"
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_query_log_access" ON "UserQueryLog"
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_recommendation_access" ON "UserRecommendation"
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "audit_log_read" ON "AuditLog"
  FOR SELECT USING (auth.role() = 'authenticated');
