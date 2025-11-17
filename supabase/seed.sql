-- Demo seed data for Supabase (PoC dev environment)
-- Uwaga: wymaga istnienia odpowiadających użytkowników w Supabase Auth

BEGIN;

-- Example users (replace UUIDs with real auth user ids in dev env)
INSERT INTO "UserProfile" (user_id, role, email, regions, industries, competitors_watchlist, keywords_include, keywords_exclude, detail_level, response_style, language, source_prefs)
VALUES
  ('00000000-0000-0000-0000-0000000000ce', 'BOARD_MEMBER', 'ceo@example.com', ARRAY['PL','EU'], ARRAY['banking'], ARRAY['Bank A','Bank B'], ARRAY['MREL','ESG'], ARRAY['marketing'], 'high', '{"length":"short","format":"bullets","language":"pl"}', 'pl', '{"internal_priority":true, "exclude_social":true}'),
  ('00000000-0000-0000-0000-0000000000cf', 'BOARD_MEMBER', 'cfo@example.com', ARRAY['PL'], ARRAY['fintech'], ARRAY['Fintech X'], ARRAY['IFRS','cyber risk'], ARRAY['HR'], 'medium', '{"length":"medium","format":"narrative","language":"pl"}', 'pl', '{"internal_priority":true}');

-- Source
INSERT INTO "Source" (source_id, type, name, base_url, default_language)
VALUES ('11111111-1111-1111-1111-111111111111', 'rss', 'Kanał finansowy', 'https://example.com/rss', 'pl')
ON CONFLICT (source_id) DO NOTHING;

-- Topic
INSERT INTO "Topic" (topic_id, title, description, topic_status, tags)
VALUES ('22222222-2222-2222-2222-222222222222', 'Nowe regulacje ESG', 'Aktualizacje dotyczące raportowania ESG w sektorze bankowym', 'growing', '["ESG","Regulacje"]')
ON CONFLICT (topic_id) DO NOTHING;

-- Document
INSERT INTO "Document" (doc_id, source_id, canonical_url, title, author, published_at, summary, status, doc_type, topic_id, metadata)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'https://example.com/esg/weekly',
  'Tydzień ESG – nowe wymagania raportowe',
  'Zespół analiz',
  NOW() - INTERVAL '1 day',
  'Najważniejsze zmiany w raportowaniu ESG dla banków w UE.',
  'new',
  'news',
  '22222222-2222-2222-2222-222222222222',
  '{"language":"pl"}'
)
ON CONFLICT (doc_id) DO NOTHING;

-- Chunk
INSERT INTO "ChunkEmbedding" (chunk_id, doc_id, chunk_index, text, embedding, metadata)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  0,
  'Komisja Europejska publikuje nowe wytyczne ESG obejmujące banki w regionie UE.',
  (SELECT ARRAY(SELECT 0.0::float FROM generate_series(1,768))::vector),
  '{"section":"summary"}'
)
ON CONFLICT (chunk_id) DO NOTHING;

-- Topic scores
INSERT INTO "UserTopicScore" (user_id, topic_id, score, last_seen_at, interactions_count)
VALUES
  ('00000000-0000-0000-0000-0000000000ce', '22222222-2222-2222-2222-222222222222', 1.5, NOW() - INTERVAL '2 day', 2),
  ('00000000-0000-0000-0000-0000000000cf', '22222222-2222-2222-2222-222222222222', 1.0, NOW() - INTERVAL '1 day', 1)
ON CONFLICT (user_id, topic_id) DO NOTHING;

COMMIT;
