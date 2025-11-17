# Architektura PoC – Asystent Zarządu

## Cel
Dowiezienie PoC (Faza 0) opisanego w `blueprint.md`, obejmującego dwóch użytkowników (CEO, CFO), ograniczony zestaw źródeł i pełny przepływ: ingest → wektorówka → RAG → frontend. Plan zakłada monorepo z możliwością dalszego skalowania w Fazie 1.

## Kontekst i założenia
- Wszystkie usługi uruchamiane lokalnie w Docker Compose (dev) w sieci prywatnej.
- Minimalne bezpieczeństwo zgodne z blueprintem: stub OIDC, RLS w Postgres, brak logowania treści Q&A, szyfrowane sekrety.
- PoC działa bez dostępu do prawdziwego OpenAI (fallback wektorów), ale umożliwia wpięcie klucza.
- Repozytorium korzysta z pnpm i TypeScript jako lingua franca (z wyjątkiem FastAPI). Wszystkie komunikaty UI i dokumentacja w języku polskim.

## Komponenty i interfejsy

### Frontend – `portal-assistants`
- React + Vite + TypeScript.
- Widoki: Dashboard tygodniowy, Chat, Lista tematów, Ustawienia profilu.
- Integracja z backendem przez REST (HTTPS). Token JWT dostarczony przez mock OIDC.
- Globalny stan: React Query (fetch) + Zustand (preferencje lokalne).
- Stylowanie: Tailwind (dev) + Headless UI, wsparcie dla trybu ciemnego i dostępności.

### Backend – `core-service`
- NestJS + TypeScript.
- Moduły: Auth, Profiles, Topics, Assistant, Sources, Health, Observability.
- Prisma ORM + Postgres 16 (pgvector). Migracje i seedy.
- Endpoints kluczowe:
  - `GET/PUT /profiles/me`
  - `POST /assistant/query`
  - `POST /assistant/feedback`
  - `GET /topics`, `GET /topics/:id`
  - `POST /sources/ingest`
- Integracje: rag-service (HTTP), MinIO (blob), Prometheus metrics.
- Testy: Jest (unit), Supertest (e2e), OpenAPI generowany automatycznie.

### rag-service – `rag-service`
- FastAPI (Python) + SQLAlchemy + pgvector.
- Endpoints: `/answer`, `/embed`, `/classify-topic`, `/healthz`.
- Logika:
  - Embeddings: OpenAI API (gdy dostępne) lub fallback (deterministyczne hashowanie → wektor).
  - Retrieval: zapytanie wektorowe do Postgres (pgvector) + filtry (profil, data, tagi).
  - Prompt: struktura TL;DR, Kluczowe wydarzenia, Artykuły, Rekomendacje; walidacja Pydantic.
  - Anti-hallucination: confidence score, fallback odpowiedzi.
- Testy: pytest (unit + integracyjny `/answer`).

### Warstwa danych
- Postgres 16 z rozszerzeniami pgvector oraz RLS.
- Schemat Prisma obejmuje: Source, RawDocument, Document, ChunkEmbedding, Topic, UserProfile, UserTopicScore, UserQueryLog, AuditLog.
- MinIO – mock blob storage dla raw plików.
- Opcjonalne Qdrant (off w PoC, przygotowane w Compose).

### Ingestion & Orkiestracja
- n8n (self-hosted) z workflow `weekly-knowledge-refresh` (JSON) odzwierciedlający blueprint 5.1.
- CLI `tools/fetch-sources.ts` – lokalny ingest bez n8n.
- Sample źródeł w `data/sources/` (RSS JSON, raport Markdown).
- Logika deduplikacji, chunkowania, embeddings, przypisywania tematów, metryk.

### Observability
- Prometheus + Grafana + Loki + Alertmanager + Pushgateway w `observability/`.
- Instrumentacja backendu (NestJS metrics), rag-service (Prometheus exporter), ingestu (Pushgateway).
- Logowanie strukturalne JSON (Pino + uvicorn logger) bez treści Q&A.

## Komunikacja między komponentami
- Frontend ↔ Backend: REST (HTTPS) + SSE/long polling dla streamingu odpowiedzi.
- Backend ↔ rag-service: REST (JSON). Retry, timeout, circuit breaker.
- Ingestion ↔ Backend/rag-service: HTTP webhooki/REST.
- Wszystkie połączenia wewnętrzne przez sieć Docker Compose (bridge, TLS opcjonalny w PoC).

## Bezpieczeństwo
- Stub OIDC: generowanie JWT z `auth-service` mock w Compose (Keycloak dev lub token issuer Node).
- RLS w Postgres (UserProfile, UserTopicScore, UserQueryLog) – implementacja w migracjach SQL.
- Sekrety w `.env` (lokalne) + opis przeniesienia do Vault w doc.
- Audyt: middleware logujące zdarzenia do `AuditLog` (pseudonimy).

## Plan wdrożenia (wysoki poziom)
1. Skonfigurowanie monorepo, pnpm, Docker Compose (Postgres, MinIO, Keycloak, Prometheus, Grafana, Loki, n8n).
2. Implementacja backendu (NestJS + Prisma) z modułami, migracjami, seedami demo.
3. Implementacja rag-service (FastAPI) z retrieval pipeline oraz fallback embedding.
4. Przygotowanie narzędzi ingestu + sample data + workflow n8n.
5. Implementacja frontend SPA z przepływem RAG, dashboardem i ustawieniami profilu.
6. Instrumentacja i observability (metrics, logs, dashboards).
7. Dokumentacja, runbook, compliance, roadmap, validation report.
8. Walidacja end-to-end i opis wyników.

## Ryzyka i mitigacja
- **Złożoność monorepo** – podział na workspaces, wspólne komendy pnpm, CI pipeline.
- **Brak realnego OpenAI** – fallback embeddings, mock response w rag-service.
- **RLS i Prisma** – ręczne migracje SQL + testy integracyjne.
- **Observability** – minimalne dashboardy, sprawdzenie metryk w Compose.
- **Czas** – PoC skupia się na skeletonach i demie (konfiguracja do rozwinięcia w Fazie 1).

## Artefakty ADR
- Większe decyzje (np. wybór NestJS, fallback embeddings) dokumentowane w `docs/adr/` (plan: ADR-001 Monorepo, ADR-002 RLS strategy, ADR-003 Embeddings fallback).
