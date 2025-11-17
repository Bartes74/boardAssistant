# Architektura docelowa – Supabase + Vercel

## Cele migracji
- Zastąpić lokalny Postgres + Docker Compose usługami Supabase (Database, Auth, Storage, Edge Functions) w środowiskach dev/preview/prod.
- Wykorzystać Vercel do hostingu frontendu (React) oraz lambd/edge (backend API, webhooks) z automatycznymi buildami z GitHuba.
- Utrzymać funkcjonalność PoC (RAG, ingest, personalizacja) i poprawić UX, bezpieczeństwo oraz developer experience.

## Komponenty
### Supabase
- **Database**: Postgres z rozszerzeniem `pgvector`, schemat zgodny z Prisma (Topic, Document, ChunkEmbedding, UserProfile, itp.). Migracje w `supabase/migrations`, seedy w `supabase/seed.sql`.
- **Auth**: GoTrue JWT – profile użytkowników zarządzane w Supabase, rola `board_member` itd. NestJS używa `supabase-js` do walidacji tokenów i claims.
- **Storage**: Bucket `documents` (oryginalne pliki), bucket `chunks` (fallback). Narzędzie CLI do uploadów w ingest.
- **Edge Functions**: dedykowane endpoints (np. `classify-topic`, `ingest-webhook`) uruchamiane z cron Vercela lub Supabase.

### Vercel
- **Frontend**: `portal-assistants` (Vite) budowany statycznie (`frontend/dist`) i serwowany przez Vercel. Autoryzacja via `@supabase/auth-helpers-react` (SessionContextProvider + client-side fetch).
- **Backend API**: NestJS jako funkcja serverless (`api/core-service.ts`) opakowana `@vendia/serverless-express`. Proxy do rag-service (`api/rag.ts`) korzysta z `RAG_SERVICE_URL`.
- **Edge Middleware**: planowane (CSP, rate limiting, feature flags) – do wdrożenia w Fazie 1.
- **Cron Jobs**: Vercel Scheduled Functions (TODO) zamiast `n8n` – ingest + raporty.

## Przepływ danych
1. Użytkownik loguje się przez Supabase Auth (SSO/OIDC docelowo); frontend otrzymuje session + JWT.
2. Frontend wysyła zapytanie do backendu hostowanego na Vercel – nagłówek `Authorization: Bearer <JWT>`.
3. Backend (NestJS) waliduje JWT poprzez Supabase Admin API, ustawia kontekst użytkownika dla RLS w bazie (Supabase Row Level Security).
4. Backend woła rag-service (również na Vercel lub jako Supabase function) – ta usługa korzysta z Supabase DB do retrieval.
5. Odpowiedzi trafiają do frontu, UI prezentuje dane (dashboard, chat, tematy).

## Bezpieczeństwo
- JWT podpisy Supabase + weryfikacja kluczy JWKS.
- RLS polityki przeniesione do Supabase (`policies.sql`).
- Sekrety: `supabase/.env` + `vercel env` + GitHub secrets.
- CSP, HSTS, rate limiting (Vercel Edge Middleware) + Semgrep w CI.

## Dev/Preview/Prod
- `supabase start` dla lokalnego dev (Docker) z synchronizacją migracji.
- `supabase db push` + `supabase db diff` w CI.
- Vercel preview z konfiguracją Supabase project dev (service role w sekretach branchowych).

## Kolejne kroki
1. Utworzyć strukturę `supabase/` (config, migrations, seeds).
2. Zaktualizować backend (NestJS) do Supabase auth i storage.
3. Zmodyfikować rag-service do Supabase connection.
4. Przebudować frontend (nowy UI + Supabase auth helpery).
5. Skonfigurować Vercel (CLI, `vercel.json`, `api/` functions).
6. Ustawić CI/CD (GitHub Actions + Vercel + Supabase migrations + Semgrep).
7. Zaktualizować dokumentację (runbook, validation, research).
