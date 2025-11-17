# Board Member Assistant – Supabase + Vercel PoC

Aplikacja pomaga członkom zarządu śledzić strategiczne tematy, agreguje źródła wiedzy i udostępnia spersonalizowanego asystenta RAG. Bieżąca iteracja przenosi PoC do środowiska Supabase (Postgres + Auth + Storage) i Vercel (frontend + funkcje serverless).

## Architektura
```mermaid
graph TD
  A[Frontend SPA (Vite/React)] -->|REST| B[Vercel Function: core-service]
  B -->|Prisma| C[(Supabase Postgres + pgvector)]
  B -->|Storage API| D[(Supabase Storage)]
  B -->|HTTP| E[Vercel Function: rag proxy]
  E -->|REST| F[rang-service (FastAPI)]
  F -->|SQLAlchemy| C
  G[Supabase Auth] -->|JWT| A
  G -->|JWT| B
  H[GitHub Actions] -->|CI/CD| I[Vercel Deploy Preview]
```

## Stack
- **Backend** – NestJS + Prisma, Supabase Auth (JWT) + Storage, serwowany jako funkcja serverless na Vercel (`api/core-service.ts`).
- **rag-service** – FastAPI + SQLAlchemy (Supabase Postgres), fallback embeddings bez OpenAI.
- **Frontend** – React + Vite + Tailwind, Supabase Auth helpers, motion UI (Framer Motion, Lucide, Sonner).
- **Supabase** – zarządzany Postgres z pgvector, Row Level Security z `auth.uid()`, Storage dla surowych dokumentów, CLI (`supabase/config.toml`, `supabase/migrations`).
- **CI/CD** – GitHub Actions (`.github/workflows/ci.yml`) uruchamia lint/test/build + Semgrep, push na GitHub wyzwala Vercel preview.

## Uruchomienie lokalne
1. Skonfiguruj Supabase CLI (`supabase login`) i wystartuj środowisko:
   ```bash
   pnpm supabase:start
   # opcjonalne: supabase db reset --schema public
   supabase db push
   supabase db seed
   ```
2. Zainstaluj zależności i uruchom usługi:
   ```bash
   pnpm install
   pnpm --filter ./backend run dev
   pnpm --filter ./rag-service run dev
   pnpm --filter ./frontend run dev
   ```
3. Frontend: `http://localhost:5173`, API (serverless lokalnie): `http://localhost:3000/api`, rag-service: `http://localhost:8000`.

### Vercel dev (podgląd end-to-end)
```bash
pnpm vercel:dev
```
- Vercel dev wykorzysta `api/core-service.ts` oraz `api/rag.ts` do proxy.
- W `.env.local` ustaw `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (Supabase).

### Struktura repozytorium
- `backend/` – NestJS, Prisma (UUID schema), serverless entry (`src/main.serverless.ts`).
- `rag-service/` – FastAPI (Supabase DB), testy `pytest`.
- `frontend/` – Vite SPA z Supabase Auth, nowy dashboard/chat/profile.
- `supabase/` – `config.toml`, `migrations/000_init.sql`, `seed.sql`, `env.example` (skopiuj do `supabase/.env`).
- `api/` – funkcje Vercel (`core-service.ts`, `rag.ts`).
- `docs/` – `architecture-supabase.md`, `runbook.md`, `compliance.md`, `validation-report.md`, `research/`.
- `semgrep_rules/` – dodatkowe reguły bezpieczeństwa.

## Testy
```bash
pnpm --filter ./backend run test
pnpm --filter ./rag-service run test
pnpm --filter ./frontend run test
pnpm --filter ./frontend run test:e2e
```
CI (`.github/workflows/ci.yml`) wykonuje powyższe oraz `semgrep` (`p/ci` + reguły lokalne).

## Środowisko / zmienne
- Skopiuj `docs/env.example` → `.env` (root) oraz `supabase/env.example` → `supabase/.env`.
- (Frontend) Skopiuj `frontend/env.example` → `frontend/.env.local`.
- Najważniejsze wartości:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL` (Supabase Postgres, np. `postgresql://postgres:postgres@127.0.0.1:54322/postgres`)
  - `RAG_SERVICE_URL` – baza rag-service (używana przez funkcję Vercel `api/rag.ts`)
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CORE_SERVICE_URL` (frontend)
  - `ALLOW_MOCK_USER=true` umożliwia lokalny nagłówek `x-mock-user`

## Supabase RLS i bezpieczeństwo
- RLS używa `auth.uid()`; Prisma ustawia `request.jwt.claim.sub` i `request.jwt.claim.role` dla Supabase.
- Supabase Storage przechowuje surowe dokumenty (endpoint ingest zapisuje `ingest/{docId}.json`).
- Semgrep pilnuje, aby nie logować sekretów (`semgrep_rules/supabase-auth.yml`).
- Vercel funkcje wymagają ustawienia sekretów (`vercel link`, `vercel env`).

## Deploy
1. Commit + push → GitHub (GA uruchamia CI + Semgrep).
2. Vercel powiązany z repo tworzy preview (link w PR), wykorzystuje `vercel.json` (`buildCommand`, `rewrites`).
3. Migrations Supabase: `supabase db push` (lokalnie) + ręczne `supabase db deploy` (prod) – opis w `docs/runbook.md`.

## Dalsza roadmapa
`docs/roadmap.md` zawiera kroki do MVP (Faza 1) – m.in. integracja z IdP, rozbudowany scoring, scheduled functions w Vercel/Supabase, monitoring kosztów.
