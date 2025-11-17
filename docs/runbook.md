# Runbook – Board Member Assistant (Supabase + Vercel)

## Start / Stop lokalnie
1. Uruchom Supabase (Postgres + Auth + Storage):
   ```bash
   pnpm supabase:start
   # Po pierwszym uruchomieniu
   supabase db push
   supabase db seed
   ```
2. Wstrzymaj Supabase: `pnpm supabase:stop`.
3. Uruchom aplikacje:
   ```bash
   pnpm --filter ./backend run dev
   pnpm --filter ./rag-service run dev
   pnpm --filter ./frontend run dev
   ```
4. Alternatywa: `pnpm vercel:dev` (frontend + funkcje serverless w jednym procesie).

## Przegląd endpointów
- Frontend: `http://localhost:5173`
- Backend (serverless lokalnie): `http://localhost:3000/api/health`
- rag-service: `http://localhost:8000/healthz`
- Supabase Studio: `http://127.0.0.1:54323`

## Bootstrapping danych
```bash
supabase db push     # synchronizacja migracji z supabase/migrations
supabase db seed     # demo CFO/CEO + temat ESG
pnpm --filter ./tools run fetch  # ingest przykładowych źródeł (zapis do Supabase)
```

## Deploy / Preview
1. Commit + push (branch feature) → GitHub Actions (lint/test/build + Semgrep).
2. Vercel automatycznie tworzy preview (link w PR).
3. Sekrety Vercel (`vercel env`): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RAG_SERVICE_URL`.
4. `vercel --prod` po akceptacji.

## Zdrowie usług
- Supabase DB: `supabase status`, `supabase db remote commit`.
- Backend health: GET `/api/health` (Vercel) – zwraca status DB + rag-service.
- rag-service: `/healthz`.
- Logs Vercel: `vercel logs <deployment>`.
- Supabase Storage: panel `Storage` w Studio.

## Typowe problemy
| Problem | Objawy | Rozwiązanie |
| --- | --- | --- |
| Brak sesji Supabase | frontend przekierowuje na `/auth/login` | sprawdź `VITE_SUPABASE_URL/ANON_KEY`, upewnij się że Supabase działa (`supabase start`) |
| 401 w backendzie | `Unauthorized` w odpowiedziach | czy token Supabase przekazywany (sprawdź `network > headers > Authorization`); w razie potrzeby `ALLOW_MOCK_USER=true` + `x-mock-user` |
| RLS blokuje dostęp | logi DB: `permission denied` | upewnij się, że Prisma ustawił `request.jwt.claim.sub` (sprawdź `logs/supabase/postgres.log`), token jest z Supabase |
| Proxy rag-service (Vercel) zwraca 500 | `Nie udało się połączyć z rag-service` | ustaw `RAG_SERVICE_URL` (np. `https://rag-service.vercel.app` lub lokalny `http://localhost:8000`) |
| `supabase start` konflikt portu | port 54322/54323 zajęty | zakończ inne kontenery, zmień port w `supabase/config.toml` |

## Monitoring i alerty
- GitHub Actions status → blokuje merge jeśli lint/test/build/semgrep się nie powiódł.
- Dla produkcji zaplanuj: Supabase alerts (koszty, RLS), Vercel Analytics (Core Web Vitals), integracja z Slack/Teams.

## Recovery scenariusze
1. **Supabase reset**: `supabase db reset --schema public` + `supabase db seed`.
2. **Regeneracja danych demo**: `pnpm --filter ./backend run db:seed` + `pnpm --filter ./tools run fetch`.
3. **Wymuszenie wygenerowania nowego handlera serverless**: usuń `backend/dist`, `pnpm --filter ./backend run build`.
4. **Re-deploy preview**: `vercel --prod false --force` lub restart pipeline z PR.
