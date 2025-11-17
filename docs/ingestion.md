# Ingest danych – Weekly Knowledge Refresh

## Przegląd
Workflow opiera się na Supabase + CLI ingest (`tools/fetch-sources.ts`). Obecnie:

- `supabase/migrations/000_init.sql` – tabele `Source`, `Document`, `ChunkEmbedding`, `Topic`, `UserProfile` (UUID + pgvector).
- `tools/fetch-sources.ts` – lokalne uruchomienie ingestu (Node + Axios) z zapisem do backendu (`POST /sources/ingest`).
- `data/sources/*.json` – przykładowe źródła (RSS, raporty) w formacie Supabase (UUID).
- `core-service` – endpoint `POST /sources/ingest` upsertuje dokumenty, generuje fallback embeddings i zapisuje surowy JSON do Supabase Storage (`documents/ingest/{docId}.json`).

_Docelowo (Faza 1): przeniesienie logiki do Supabase Edge Function + Vercel Scheduled Function._

## Kroki ingestu
1. **Źródła** – Supabase `Source` (`active = true`).
2. **Pobranie** – CLI wykonuje requesty HTTP/REST/itd., normalizuje dane.
3. **Dedup** – backend sprawdza `canonical_url` (`Document.upsert`).
4. **Chunking + Embeddings** – fallback (deterministyczne wektory) lub `rag-service /embed`.
5. **Topic linking** – `topic_id` (jeśli brak → heurystyka / nowy temat).
6. **Storage** – zapis JSON do bucketu Supabase (prywatny), metadane w `Document`.
7. **Scoring** – `UserTopicScore` aktualizowany przy zapytaniach/feedbacku.

## Uruchomienie lokalne CLI
```bash
pnpm --filter ./tools run fetch
```
Zmienne (`.env`):
- `CORE_SERVICE_URL` – np. `http://localhost:3000` lub `https://boardassistant.vercel.app/api`.
- `SUPABASE_SERVICE_ROLE_KEY` (pośrednio wykorzystywane w backendzie) – musi być ustawione, aby endpoint ingest mógł pisać do Storage.

## Bezpieczeństwo
- Supabase Storage bucket `documents` – prywatny, dostęp poprzez `service_role` (backend). Do produkcji dodać politykę RLS i podpisywane URL.
- RLS w Supabase: tabele użytkownika (`UserQueryLog`, `UserTopicScore`, `UserRecommendation`) filtrowane przez `auth.uid()`. Endpoint ingest działa z service role (omija RLS).
- Semgrep reguła `no-secret-logging` blokuje przypadkowe logowanie tokenów Supabase.

## Rozszerzanie
- Nowe źródło: INSERT do `Source` + konfiguracja credentials w Supabase Secrets / Vercel env.
- Planowane: Supabase Edge Function (`cron`) pobierająca źródła, zapis do Storage + queue, fallback do Vercel cron.
- Embeddings OpenAI: dodać `OPENAI_API_KEY` (backend + rag-service) i zamienić fallback w `rag-service/app/services/assistant.py`.
