<objective>
Zbuduj end-to-end proof-of-concept aplikacji „Asystent Zarządu” opisanej w @blueprint.md, tak aby członkowie zarządu otrzymywali spersonalizowane podsumowania tygodniowe i chat z kontekstem. Zapewnij spójny monorepo i działające środowisko uruchomieniowe gotowe do pilotażu (Faza 0) w sieci wewnętrznej organizacji.
</objective>

<context>
- Produkt działa w intranecie/VPC, integruje frontend (React), backend API (NestJS), rag-service (FastAPI) oraz warstwę danych Postgres+pgvector, zgodnie z architekturą z blueprintu.
- PoC obejmuje min. 2 użytkowników (CEO, CFO) i kilka źródeł (RSS, przykładowe dokumenty); wynik posłuży do walidacji wartości biznesowej przed MVP.
- Zachowaj wymagania bezpieczeństwa: SSO/OIDC stub, RLS w Postgres, brak logowania treści pytań, szyfrowane sekrety – to krytyczne, bo dane zarządu są wrażliwe.
- Przed rozpoczęciem przeczytaj @blueprint.md oraz @CLAUDE.md (wytyczne projektowe) i stosuj konwencje repozytorium.
- Użyj języka polskiego w komunikatach UI i README, zachowując nazwy techniczne komponentów po angielsku.
</context>

<requirements>
Backend API (NestJS + TypeScript):
- Utwórz serwis `core-service` (NestJS) z modułami: Auth (OIDC stub), Profiles, Topics, Assistant, Sources, Health.
- Zaimplementuj modele danych z blueprintu (Source, Document, Topic, UserProfile, UserTopicScore, ChunkEmbedding) w Prisma z migracjami do Postgresa (pgvector).
- Zapewnij REST endpoints: `GET/PUT /profiles/me`, `POST /assistant/query`, `POST /assistant/feedback`, `GET /topics`, `GET /topics/:id`, `POST /sources/ingest` (dla n8n).
- Integruj rag-service przez HTTP (timeout, retry, circuit breaker) i loguj metryki (Prometheus) bez przechowywania pełnych treści pytań, aby chronić PII.
- Dodaj walidację wejścia (class-validator), automatyczną dokumentację OpenAPI oraz podstawowe testy e2e (Jest + Supertest).

Warstwa danych i infrastruktura:
- Użyj Docker Compose do uruchomienia Postgres 16 z rozszerzeniem pgvector, MinIO jako mock blob storage i opcjonalnie lokalnego Qdrant.
- Skonfiguruj migracje Prisma oraz seed danych (użytkownicy CFO/CEO, 3 źródła, 5 dokumentów, 3 tematy, embeddings demo).
- Włącz Row-Level Security na tabelach `user_profile`, `user_topic_score`, `user_query_log` z politykami zgodnymi z blueprintem.
- Przygotuj `scripts/bootstrap-data.ts` do inicjalizacji danych i generowania przykładowych chunków/embeddingów; gdy brak `OPENAI_API_KEY`, generuj deterministyczny fallback wektor, by PoC działał offline.
- Zapewnij konfigurację sekretów (`.env`, `.env.example`) oraz opis przechowywania w README.

rag-service (FastAPI + Python):
- Utwórz serwis `rag-service` z endpointami `/answer`, `/embed`, `/healthz` i szkicem `/classify-topic`.
- Implementuj retrieval z Postgres/pgvector (SQLAlchemy + pgvector), filtrując według profilu użytkownika, daty i tagów; agreguj wyniki per temat.
- Zdefiniuj system prompt zgodny z blueprintem (sekcje TL;DR, Kluczowe wydarzenia, Artykuły, Rekomendowane działania) oraz walidację schematu odpowiedzi (pydantic).
- Dodaj kontrolę halucynacji: confidence score, fallback odpowiedzi „brak danych” przy zbyt niskiej relewancji oraz sanitację prompt injection.
- Zapewnij testy jednostkowe (pytest) dla pipeline’u embed/retrieval oraz integracyjny test `POST /answer`.

Front-end (React + Vite + TypeScript):
- Utwórz SPA `portal-assistants` z widokami: Dashboard tygodniowy, Chat asystenta, Lista tematów, Ustawienia profilu (zgodnie z blueprintem 9.2).
- Zaimplementuj stan globalny (React Query + Zustand) i integrację z backendem (JWT z mock IdP) oraz streaming odpowiedzi (Server-Sent Events lub long polling).
- Zadbaj o dostępność (ARIA), tryb ciemny oraz responsywność dla tabletów; UI w języku polskim.
- Dodaj obsługę feedbacku („oznacz ważne”, „oznacz przeczytane”) i aktualizację scoringu w czasie rzeczywistym.
- Przygotuj testy komponentów (Vitest + Testing Library) i e2e smoke (Playwright) dla kluczowych przepływów.

Ingestion / n8n / ETL:
- Dostarcz workflow n8n `n8n/workflows/weekly-knowledge-refresh.json` odzwierciedlający kroki z sekcji 5.1 z placeholderami credentiali i notatkami bezpieczeństwa.
- Stwórz skrypt CLI `tools/fetch-sources.ts` (Node) pozwalający uruchomić ingest lokalnie bez n8n (cron stub, deduplikacja, chunking, wywołanie `/embed`, przypisanie tematów).
- Dodaj sample źródeł (RSS feed JSON, wewnętrzny raport Markdown) w `data/sources/` i pokaż w README jak rozszerzyć.
- Wysyłaj metryki ingestu do Prometheus Pushgateway (Docker Compose) oraz logi strukturalne do plików JSON.
- Zapewnij manual w `docs/ingestion.md`, jak dodać nowe źródło oraz topic heuristics.

Observability, bezpieczeństwo, DX:
- Skonfiguruj monitoring (Prometheus, Grafana dashboard, Loki) oraz alerty (Alertmanager rules) w `observability/`.
- Dodaj middleware audytowe zapisujące zdarzenia do `audit_log` z pseudonimizacją user_id, co minimalizuje ryzyko wycieku PII.
- Zapewnij checklistę RODO i politykę retencji w `docs/compliance.md`, zgodnie z sekcjami 8 i 13 blueprintu.
- Dodaj CI (`.github/workflows/ci.yml`) do lintowania, testów i budowy obrazów kontenerowych.
- Przygotuj `README.md` z opisem architektury, instrukcją uruchomienia, diagramem przepływu (Mermaid) i planem rozwoju faz 1–3.
</requirements>

<implementation>
1. Dogłębnie przeanalizuj @blueprint.md i bezpieczeństwo danych; sporządź krótki plan architektury (komentarze/ADR) i potwierdź zgodność z PoC.
2. Skonfiguruj monorepo pnpm (root `package.json`, `pnpm-workspace.yaml`) z workspace’ami `backend`, `rag-service`, `frontend`, `tools`, `observability`, wspólnymi lintami i tsconfig.
3. Przygotuj `docker-compose.yml` oraz `Dockerfile` dla usług (backend, rag-service, frontend, postgres, minio, prometheus, grafana, loki, pushgateway) wraz z wolumenami i zależnościami sieciowymi.
4. Zaimplementuj backend (NestJS) z modułami, Prisma schema, migracjami, seedami oraz testami e2e (Jest + Supertest).
5. Zaimplementuj rag-service (FastAPI) z pipeline’em retrieval, obsługą OpenAI, walidacją odpowiedzi i testami (pytest).
6. Stwórz skrypt ingestu i workflow n8n; zaimplementuj deduplikację, chunking, generowanie embeddings, aktualizację tematów i metryki.
7. Zaimplementuj frontend (React) z widokami, integracją API, stanem globalnym, testami komponentów i e2e.
8. Skonfiguruj observability (Prometheus, Grafana, Loki), instrumentację usług oraz dashboardy i alerty.
9. Utwórz dokumentację (`README`, `docs/architecture.md`, `docs/ingestion.md`, `docs/compliance.md`, `docs/runbook.md`) z diagramami i instrukcjami.
10. Uruchom pełny pipeline lokalnie (bootstrap danych, ingest, zapytanie użytkownika), zweryfikuj wyniki i opisz w `docs/validation-report.md`.
11. Przygotuj plan kolejnych kroków (Faza 1) w `docs/roadmap.md`, wskazując obszary wymagające skalowania.
</implementation>

<output>
- `./docker-compose.yml` – orkiestracja usług backend, rag-service, frontend, bazy, observability.
- `./package.json` oraz `pnpm-workspace.yaml` – konfiguracja monorepo i wspólne skrypty.
- `./backend/**` – NestJS service, Prisma schema, migracje, testy, konfiguracja OpenAPI.
- `./rag-service/**` – FastAPI service, SQLAlchemy warstwa danych, testy, definicje promptów.
- `./frontend/**` – React SPA, komponenty UI, testy, konfiguracja i18n.
- `./tools/**` i `./n8n/workflows/weekly-knowledge-refresh.json` – skrypty ingestu i workflow ETL.
- `./observability/**` – konfiguracja Prometheus/Grafana/Loki oraz dashboardy.
- `./docs/**`, `.env.example`, `docs/validation-report.md`, `docs/roadmap.md` – dokumentacja, compliance, instrukcje.
</output>

<verification>
- Uruchom `!pnpm install` oraz `!pnpm lint` w monorepo i upewnij się, że lint przechodzi.
- Wykonaj `!pnpm test --filter backend...` i `!pnpm test --filter rag-service...` oraz testy frontendowe (`!pnpm test --filter frontend...`).
- Zbuduj i uruchom środowisko `!docker compose up --build` i zweryfikuj health-checki usług.
- Przeprowadź end-to-end scenariusz: `tools/fetch-sources.ts` → `POST /assistant/query` (curl) → odbiór odpowiedzi w UI; udokumentuj wyniki w `docs/validation-report.md`.
- Uruchom Playwright smoke `!pnpm test --filter portal-assistants-e2e...` oraz sprawdź dashboard Grafany i logi Loki pod kątem metryk.
</verification>

<success_criteria>
- Wszystkie komponenty uruchamiają się lokalnie w Docker Compose, a zapytanie użytkownika zwraca ustrukturyzowaną odpowiedź z kontekstu PoC.
- Postgres z RLS i pgvector przechowuje dane demo, embeddings oraz logi audytu zgodnie z blueprintem.
- Frontend prezentuje dashboard tygodniowy, chat i listę tematów, a interakcje feedback aktualizują scoring użytkownika w czasie rzeczywistym.
- Observability zapewnia podstawowe metryki i alerty, a logi nie zawierają wrażliwych treści (tylko identyfikatory).
- Dokumentacja opisuje architekturę, uruchomienie, bezpieczeństwo i roadmapę, umożliwiając zespołowi przejście do Fazy 1.
</success_criteria>
