# Compliance i bezpieczeństwo (PoC)

## RODO / privacy-by-design
- **Minimalizacja danych** – w logach operacyjnych zapisujemy tylko identyfikatory (`user_id`, `topic_id`), brak treści pytań. Pełne dane profilu przechowywane w Supabase (`UserProfile`).
- **Retencja** – polityka PoC: logi zapytań i rekomendacji 12 miesięcy (konfigurowalne). Supabase Storage przechowuje dokumenty źródłowe – należy ustalić retencję (np. 24 miesiące, zgodnie z polityką compliance).
- **Prawo do bycia zapomnianym** – job usuwający dane użytkownika z tabel (`UserProfile`, `UserTopicScore`, `UserQueryLog`, `UserRecommendation`) + pliki storage (`documents/ingest/{user}`).

## Kontrola dostępu (Supabase)
- RLS oparte na `auth.uid()` – Prisma ustawia `request.jwt.claim.sub` i `request.jwt.claim.role` dla każdej transakcji (`PrismaService`).
- Role Supabase: `authenticated` (board member), `service_role` (funkcje serverless), możliwość definiowania ról domenowych (np. `admin`).
- Tokeny JWT Supabase zastąpiły mock `user|ROLE|email`; nagłówek `x-mock-user` dostępny tylko gdy `ALLOW_MOCK_USER=true` w `.env` (dev).
- Dostęp do Supabase Storage kontrolowany przez RLS + polityki bucketów.

## Szyfrowanie i sekrety
- HTTPS przez Vercel (frontend + API). Supabase zapewnia TLS w bazie / REST / Storage.
- Sekrety:
  - Lokalnie: `.env` + `supabase/.env` (warto przenieść do `doppler` / `infisical` / `Vault`).
  - Vercel: `vercel env` (link w `README.md`).
  - GitHub Actions: secrets repo (`SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN`, itp.).
- Hasła DB / JWT trzymane w Supabase CLI `.env` – nie commitować (patrz `.vercelignore`, `.gitignore`).

## Audyt i monitoring
- Supabase Audit logi włączać przed produkcją (`auth.audit_log_enabled`).
- Backend loguje zdarzenia za pomocą `nestjs-pino` (bez danych wrażliwych). Dalszy plan: zapis do `AuditLog` + integracja z Supabase Logflare.
- GitHub Actions + Semgrep pilnują jakości i bezpieczeństwa kodu przed merge.

## Ryzyka i działania
- **Utrata kluczy Supabase** – korzystać z rolowania kluczy (`supabase keys list/rotate`), zablokować dostęp w razie incydentu.
- **Prompt injection** – walidacja w rag-service (sprawdzanie źródła, fallback). W kolejnych fazach dodać walidator i scoring zaufania.
- **Koszty API** – brak zależności od OpenAI (fallback embeddings). Monitoruj koszty Supabase / Vercel (dashboardy w planie Fazy 1).
- **Eksfiltracja Storage** – bucket `documents` skonfigurowany jako prywatny; do produkcji dodać podpisywane URL + rewizje.
