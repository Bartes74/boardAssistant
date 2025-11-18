<objective>
Przeanalizuj aplikację Board Member Assistant, aby szczegółowo rozpisać ścieżki użytkownika dla każdej roli (`BOARD_MEMBER`, `ADMIN`, `SECURITY_OFFICER`). Celem jest zrozumienie doświadczeń użytkowników oraz identyfikacja luk funkcjonalnych i komunikacyjnych między rolami.
</objective>

<context>
Projekt składa się z backendu opartego na NestJS + Prisma oraz frontendu w React/TypeScript. Analiza ma objąć zarówno warstwę API, jak i interfejsy użytkownika. Przed rozpoczęciem pracy koniecznie zapoznaj się z `./CLAUDE.md`, aby uwzględnić konwencje tego repozytorium.
@[backend/src/modules]
@[frontend/src/features]
@[docs/ingestion.md]
@[prompts/001-build-board-assistant-poc.md]
</context>

<data_sources>
@[backend/prisma/schema.prisma]
@[backend/src/modules/auth]
@[backend/src/modules/admin]
@[backend/src/modules/profiles]
@[backend/src/modules/topics]
@[backend/src/modules/sources]
@[frontend/src/features/auth]
@[frontend/src/features/dashboard]
@[frontend/src/features/topics]
@[frontend/src/features/chat]
@[frontend/src/features/profile]
![pnpm --filter backend test -- --watch=false]
![pnpm --filter frontend test -- --watch=false]
</data_sources>

<analysis_requirements>
1. Thoroughly analyze logikę autoryzacji i ról, identyfikując uprawnienia i ograniczenia wynikające z backendu oraz frontendu.
2. Dla każdej roli przygotuj sekwencję kroków od logowania po kluczowe zadania (np. przegląd dashboardu, zarządzanie treściami, działania administracyjne). Uwzględnij zarówno ścieżki główne, jak i alternatywne (np. błędy, brak dostępu, brak danych).
3. Zmapuj powiązane endpointy API, komponenty UI, hooki oraz eventy, które wspierają poszczególne kroki. Wyszczególnij źródła danych i zależności między modułami.
4. Wskaż elementy współdzielone między rolami oraz obszary wymagające personalizacji (np. komunikaty, filtry, automatyzacje).
5. Zidentyfikuj luki i ryzyka: brakujące walidacje, brak zabezpieczeń, możliwe sprzeczności z politykami bezpieczeństwa.
6. Jeśli znajdziesz fragmenty kodu niedokumentowane lub w sprzeczności z oczekiwaną ścieżką, opisz to wraz z propozycją doprecyzowania.
</analysis_requirements>

<output_format>
Zapisz wynik analizy jako `./analyses/user-journeys-by-role.md`.
Raport powinien zawierać:
- Krótkie streszczenie celu i zakresu.
- Oddzielne sekcje dla każdej roli z tabelą kroków (`Krok`, `Cel`, `Widok/UI`, `API/Logika`, `Ryzyka/Notatki`).
- Diagram sekwencji lub pseudodiagram opisujący przepływ (może być w Markdown).
- Sekcję „Luki i rekomendacje” z priorytetami (wysoki/średni/niski).
</output_format>

<verification>
Przed zakończeniem:
- Zweryfikuj, że opisane ścieżki są zgodne z faktycznymi trasami routera i guardami ról.
- Sprawdź, czy każda rola ma pełen przepływ od logowania do głównych funkcji i czy uwzględniono stany błędów.
- Potwierdź, że raport zawiera odniesienia do kluczowych plików i modułów.
</verification>

<success_criteria>
- Wszystkie role posiadają kompletne, poprawne i uporządkowane ścieżki użytkownika.
- Raport jasno wskazuje różnice między rolami oraz elementy współdzielone.
- Zidentyfikowane zostały realne luki i ryzyka wraz z rekomendacjami.
- Plik `./analyses/user-journeys-by-role.md` jest gotowy do prezentacji interesariuszom.
</success_criteria>
