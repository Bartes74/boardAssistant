# ADR-002: Strategia Row-Level Security w Postgres

- **Status**: Accepted
- **Data**: 2025-11-17
- **Kontekst**: PoC obsługuje poufne dane zarządu. Blueprint wymaga twardej separacji danych (RBAC + RLS). Używamy Postgresa 16 z pgvector i Prisma jako ORM.
- **Decyzja**: Włączamy RLS na tabelach zawierających dane użytkowników: `user_profile`, `user_topic_score`, `user_query_log`, `user_recommendations`, `audit_log`. Tworzymy role bazodanowe `app_user` (domyślna) i `app_admin` (bez ograniczeń). Polityki RLS implementujemy w migracjach SQL wykonywanych po wygenerowaniu schematu Prisma.
- **Uzasadnienie**:
  - Spełnia wymagania blueprintu dotyczące separacji danych i audytu.
  - Prisma 5 pozwala na wykonywanie raw SQL w migracjach, co umożliwia utrzymanie polityk w repo.
  - Pozwala rozwinąć mechanizmy multi-tenant (rola per użytkownik IdP) w Fazie 1 bez przebudowy schematu.
- **Konsekwencje**:
  - Konieczność użycia `session_user` i kontekstu aplikacyjnego (np. `SET app.current_user_id`) przy połączeniach.
  - W testach e2e trzeba świadomie wyłączać/omijać RLS lub korzystać z użytkownika admin.
  - Należy opracować helper w backendzie, który ustawia `SET app.current_user_id` przy każdym zapytaniu (np. middleware Prisma).
