# Supabase + Vercel – notatki badawcze (2025-11)

## Supabase
- **RLS** – nowe funkcje (2025) pozwalają ustawiać `request.jwt.claim.sub` (Prisma middleware) bez dotykania `pg` funkcji. `auth.role()` zwraca `authenticated` lub `service_role`; dodatkowe role można przekazać jako claim `role`.
- **Vector** – `pgvector` (v0.5) wspierane natywnie, wymagana migracja `CREATE EXTENSION vector`. Do zapytań używaj `embedding <#> query` + filtrów; plan Fazy 1: przenieść retrieval do Supabase Edge Functions.
- **Storage** – bucket prywatny, polityka: `allow select` gdy `auth.uid() = metadata->>'owner_id'`. W PoC zapisujemy JSON ingestu; do produkcji dodać wersjonowanie i lifecycle policy.
- **Auth** – `supabase.auth.getUser(token)` (service role) vs JWKS. W produkcji zalecany JWKS caching (url: `${SUPABASE_URL}/auth/v1/keys`).

## Vercel
- **Serverless NestJS** – `@vendia/serverless-express` + cached handler (~50 ms cold start). Dla API-heavy endpointów rozważ Vercel Edge Functions (Next.js / Hono) lub Supabase Functions.
- **Build** – `vercel.json` z `buildCommand` (pnpm) + `outputDirectory` (frontend). Dodatkowo `vc deploy --prebuilt` oszczędza czas.
- **Preview env** – `vercel env pull` do `.env.vault`; w CI używamy GitHub secrets + `vercel env pull` w jobie.
- **Observability** – Vercel Analytics (Frontend) + Supabase monitor (DB). Rozważyć Logflare lub `vercel logs --tail` podczas wydania.

## TODO (Faza 1)
- Przenieść ingest cron do `Supabase Edge Function` / `Vercel Scheduled Function`.
- Włączyć Supabase PITR + daily backups.
- Dodać JWKS caching w backendzie (biblioteka `jose`) zamiast `auth.getUser` dla mniejszego latency.
- Mierzyć koszty: Supabase `Billing` API + Vercel `usage` – dashboard w Grafanie.
