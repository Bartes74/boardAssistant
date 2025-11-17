<objective>
Przenieś aplikację „Asystent Zarządu” z obecnej konfiguracji dockerowej do środowiska opartego o Supabase (baza, auth, storage) oraz Vercel (hosting frontend + backend edge functions) tak, aby można było zobaczyć działającą wersję preview przed produkcją. Zachowaj wszystkie funkcjonalności PoC z `blueprint.md`, jednocześnie podnosząc jakość UX/UI, bezpieczeństwo i developer experience.
</objective>

<context>
- Repozytorium monorepo pnpm (`backend`, `rag-service`, `frontend`, `tools`, `observability`). Dotychczasowa baza: Postgres + pgvector, hosting lokalny. Nowy cel: Supabase (zarządzane Postgres + Auth + Edge Functions) oraz Vercel (preview deployments + cron / edge). 
- UI ma być nowoczesny, atrakcyjny wizualnie (polski język), responsywny i intuicyjny – potraktuj redesign jako część zadania.
- Środowiska: 
  - Dev: Supabase lokalny poprzez `supabase start` oraz Vercel dev (`vercel dev`).
  - Preview: branch w GitHub -> Vercel preview -> Supabase project dev.
  - Prod: przygotuj, ale nie włączaj migracji (możliwość późniejszego promote).
- Dostępne narzędzia: Supabase CLI, Vercel CLI, Ref MCP (aktualne best practices), Semgrep MCP (security check), GitHub (konieczne push zmian dla buildów Vercela).
- Przeczytaj @blueprint.md, @docs/architecture.md, @README.md, @docs/runbook.md przed zmianami.
</context>

<requirements>
Backend / API:
- Migruj schemat Prisma do Supabase (kompatybilny Postgres + pgvector). Zastąp migracje dockerowe mechanizmem `supabase db push`. Użyj Supabase Auth (JWT) w miejsce mock OIDC; zaadaptuj Guardy NestJS do weryfikacji tokenów Supabase. 
- RAG: zapewnij, że `rag-service` korzysta z Supabase jako źródła danych i storage (np. edge functions / REST). Rozważ przeniesienie embed storage do Supabase `vector` (pgvector-enabled). 
- Zaimplementuj secure secrets flow: zmienne środowiskowe `supabase/.env`, `vercel env`, GitHub secrets. 

Frontend:
- Przebuduj UI z naciskiem na nowoczesny design (możesz użyć Tailwind + Radix UI lub inny design system). Dodaj tryb jasny/ciemny, animacje mikro. Zapewnij obsługę Supabase Auth (sign-in, session refresh) i integrację z API.
- Dodaj onboarding ekranu (pierwsze uruchomienie) oraz widok metryk RAG (karty, wykresy). 

DevOps / Deploy:
- Skonfiguruj Supabase CLI (`supabase/config.toml`, `supabase/migrations/*`, seedy). Przygotuj instrukcję provisioning projektu (`supabase projects create`).
- Skonfiguruj Vercel CLI: `vercel.json`, `api/` dla edge functions (np. `api/rag` proxy), build commands (pnpm). Dodaj preview + prod env mapping.
- Integruj GitHub Actions: lint/test/build + deploy (pnpm & vercel). Po każdej zmianie: commit (`feat:`), push do GitHub – Vercel odbierze i zbuduje (opisz w README). 

Security:
- Uruchom Semgrep MCP (konfiguracja `semgrep_rules/`). Napraw wykryte problemy. Wymuś HTTPS-only, CSP nagłówki w Vercel, RLS Supabase (konwersja polityk). 
- Implementuj monitoring kosztów API (Supabase metrics, Vercel analytics) – raportuj w docs.
</requirements>

<implementation>
1. Zaplanuj migrację danych: przeanalizuj obecne migracje (`backend/prisma`, `docs/architecture.md`) -> przygotuj `supabase/migrations`. Użyj `supabase db push` i `supabase db diff` do synchronizacji. Zadbaj o RLS i polityki (dokładne mapowanie z ADR-002).
2. Zastąp docker compose lokalnym `supabase start` i `vercel dev`. Zaktualizuj README/runbook (`docs/runbook.md`) o nowe komendy.
3. Refaktor backend: konfiguracja Supabase URL/anon/service key, generacja typów (Supabase Gen). Zaimplementuj auth guard oparty o Supabase JWT (Edge runtime). Zaimplementuj Supabase storage dla blob (MinIO -> Supabase Storage). Dodaj edge cache (Vercel) i rate limiting.
4. Przebuduj frontend: integracja z Supabase client (SessionProvider), redesign dashboardu (motion, charts – np. Tremor/Recharts). Zaimplementuj skeleton states, A11y, i obsługę dotyku. 
5. Dostarcz pipeline CI/CD: GitHub Actions (lint/test/build, semgrep), Supabase migrations (deploy script), Vercel deployment (preview + prod). Zadbaj o branch protection i automatyczne komentarze z linkami do preview. 
6. Odpal Ref MCP, aby zweryfikować najlepsze praktyki Supabase/Vercel 2025. Udokumentuj w `docs/architecture-supabase.md` powody wyborów (latencja, bezpieczeństwo, koszty).
7. Przeprowadź testy end-to-end w środowisku preview (deploy na Vercel, połączony z dedykowanym Supabase project). Zapisz wyniki w `docs/validation-report.md` (sekcja Supabase/Vercel).
</implementation>

<research>
- Użyj Ref MCP do znalezienia aktualnych wytycznych dot. Supabase RLS, edge functions, Vercel best practices (SSR, middleware, caching). 
- Zapisz notatki w `docs/research/supabase-vercel.md`. 
</research>

<constraints>
- Utrzymaj język polski w UI i dokumentacji, nazwy techniczne mogą pozostać po angielsku.
- Nie usuwaj wcześniejszych dokumentów/migracji – dodaj nowe sekcje/wersje. 
- Wszystkie commity podpisane (możesz użyć `git commit -S`). Po każdym logicznym etapie `git push origin <branch>`. Opisz w README jak odtworzyć.
</constraints>

<output>
Create/modify files with relative paths:
- `supabase/config.toml`, `supabase/.env.example`, `supabase/migrations/**`, `supabase/seed.sql` – konfiguracja Supabase.
- `backend/**` – aktualizacje Prisma, modułów auth, konfiguracji Supabase, testów.
- `rag-service/**` – integracja z Supabase, refaktory zapytań, testy.
- `frontend/**` – redesign UI, Supabase client, nowe funkcje.
- `api/**` (root) – Vercel edge functions, middleware.
- `.github/workflows/**` – CI/CD pipeline (lint/test/semgrep/vercel deploy).
- `docs/architecture-supabase.md`, `docs/runbook.md`, `docs/validation-report.md`, `docs/research/supabase-vercel.md` – dokumentacja.
- `vercel.json`, `.vercelignore` – konfiguracja Vercel.
</output>

<verification>
- Uruchom `supabase start` i potwierdź migracje (RLS, vector). 
- `vercel dev` – upewnij się, że frontend + API działają lokalnie z Supabase.
- `pnpm lint`, `pnpm test` (wszystkie workspaces). 
- `semgrep --config semgrep_rules/` (via MCP) – brak błędów. 
- Wykonaj deploy preview: `vercel --prod false`, sprawdź logi i Supabase metrics. 
- Zaktualizuj `docs/validation-report.md` z wynikami testów i linkiem do Vercel preview. 
</verification>

<success_criteria>
- Aplikacja działa w środowisku Supabase + Vercel (preview URL) z pełną funkcjonalnością PoC i odświeżonym UI.
- Auth, RLS, logowanie, monitoring kosztów oraz polityki bezpieczeństwa skonfigurowane i udokumentowane.
- CI/CD pipeline (GitHub Actions + Vercel) przechodzi (lint/test/semgrep/build) i automatycznie publikuje preview. 
- Dokumentacja (architektura, runbook, validation, research) opisuje migrację i dalsze kroki. 
- Każda istotna zmiana jest skomitowana i wypchnięta na GitHub (potwierdzone w README/runbook).
</success_criteria>
