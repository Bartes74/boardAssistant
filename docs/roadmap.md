# Roadmap – Faza 1 (MVP produkcyjne)

## Architektura
- [ ] Integracja z IdP (OIDC/SAML) → Supabase External IdP + SCIM, wyłączenie `ALLOW_MOCK_USER`.
- [ ] Wydzielenie `rag-service` na dedykowany deployment (Vercel Functions / Fly.io) + cache topic briefs (Supabase Edge Functions).
- [ ] Zastąpienie n8n: Supabase Edge Functions + Vercel Scheduled Functions dla ingestu i raportów.

## Funkcjonalności
- [ ] Rozszerzony ranking tematów (`TotalScore`) z uwzględnieniem feedbacku i metryk Supabase.
- [ ] Panel admina (Vercel) do zarządzania źródłami, bucketami Storage i politykami RLS.
- [ ] Audyt RODO – implementacja jobu „forget me” + raport retencji.

## Observability / bezpieczeństwo
- [ ] Dashboard kosztów: Supabase Billing + Vercel Usage (Grafana / Supabase functions).
- [ ] Alerty SLA (brak ingestu > N dni, wzrost czasu odpowiedzi) – Supabase Webhooks + Vercel.
- [ ] Testy penetracyjne + automatyczny skan Semgrep/OWASP (rozszerzenie workflow).
- [ ] JWKS caching & podp. podpisów – migracja z `auth.getUser` → `jose` + enforce aud/iss.

## UX
- [ ] Historia rozmów w asystencie (paginacja, timeline, eksport do PDF).
- [ ] Notyfikacje mail/Teams (Supabase Functions + Vercel cron).
- [ ] Ulepszony tryb mobilny/tablet, widżety KPI (Tremor / Recharts).

## Organizacja
- [ ] KPI pilotażu: adopcja (Supabase metrics), satysfakcja (ankiety), skuteczność rekomendacji.
- [ ] Procedury wsparcia L1/L2 (runbook incidentów, rotacja kluczy, on-call).
