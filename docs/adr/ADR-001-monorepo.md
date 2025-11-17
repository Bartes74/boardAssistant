# ADR-001: Monorepo z pnpm

- **Status**: Accepted
- **Data**: 2025-11-17
- **Kontekst**: Baza kodu obejmuje backend (NestJS), rag-service (FastAPI), frontend (React), narzędzia ingestu, konfigurację observability oraz dokumentację. Musimy wspierać współdzielone komendy CI/CD, spójne wersje zależności i łatwe zarządzanie workspace’ami.
- **Decyzja**: Używamy pnpm 9 jako menedżera pakietów i utrzymujemy wszystkie komponenty w jednym repozytorium (`boardmemberassistant-monorepo`). Każdy serwis dostaje własny workspace (`backend`, `rag-service`, `frontend`, `tools`, `observability`).
- **Uzasadnienie**:
  - pnpm wspiera hermetyczne instalacje i szybkie cache’owanie – przydatne w środowisku on-prem z ograniczonym dostępem do internetu.
  - Ułatwia współdzielenie konfiguracji lint/test/build i integrację z Docker Compose.
  - Zapewnia prostszy onboarding i możliwość uruchomienia całego PoC jednym poleceniem (`pnpm bootstrap`).
- **Konsekwencje**:
  - Konieczność utrzymywania kompatybilnych wersji Node.js (>=20) i pnpm (>=9).
  - Dla komponentu FastAPI nadal utrzymujemy zależności Pythonowe w `requirements`/`pyproject`, ale integrujemy skrypty pomocnicze (lint/test) przez pnpm z wykorzystaniem `turbo`/`npm-run-all` w przyszłości.
