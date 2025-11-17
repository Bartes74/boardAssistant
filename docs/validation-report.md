# Raport walidacyjny PoC – 2025-11-17

## Cel
Potwierdzenie, że pipeline działa end-to-end na stacku Supabase + Vercel: ingest → Supabase → RAG → UI → deploy preview.

## Kroki wykonane
1. `pnpm supabase:start` + `supabase db push` + `supabase db seed` – lokalna baza + RLS (OK).
2. `pnpm --filter ./backend run dev` + `pnpm --filter ./rag-service run dev` + `pnpm --filter ./frontend run dev` – manualny smoke (OK).
3. `pnpm --filter ./tools run fetch` – ingest demo (OK, dokument zapisany w Supabase Storage `documents/ingest/*.json`).
4. Testy jednostkowe/integracyjne:
   - `pnpm --filter ./backend run test` (OK – vitest unit + e2e placeholder).
   - `pnpm --filter ./rag-service run test` (OK – pytest `test_api.py`, `test_embeddings.py`).
   - `pnpm --filter ./frontend run test` (OK – vitest components) + `pnpm --filter ./frontend run test:e2e` (Playwright smoke) → DO WYKONANIA.
5. CI (`.github/workflows/ci.yml`) – lint/test/build + `semgrep` (p/ci + reguły własne) – pipeline zielony.
6. `pnpm vercel:dev` – lokalny preview (OK, routing `/api/*` do funkcji serverless).
7. Deploy preview Vercel (link: _TODO: wstawić URL po pierwszym deployu_).

## Wnioski
- Środowisko Supabase + Vercel działa lokalnie i w CI.
- Do uzupełnienia: Playwright e2e oraz link z Vercel preview.
- Po uzyskaniu preview i wyników e2e można przejść do planu Fazy 1 (`docs/roadmap.md`).
