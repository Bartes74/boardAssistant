# ADR-003: Fallback dla embeddings w trybie offline

- **Status**: Accepted
- **Data**: 2025-11-17
- **Kontekst**: PoC może działać bez dostępu do OpenAI (np. w odizolowanej sieci). Musimy zapewnić możliwość uruchomienia ingestu i rag-service bez prawdziwych embeddingów, zachowując powtarzalność wyników demo.
- **Decyzja**: Implementujemy fallback generujący deterministyczne wektory na podstawie hashy tekstu (np. SHA-256 → mapowanie do przestrzeni 768D). Mechanizm włączany gdy `OPENAI_API_KEY` nie jest ustawiony. Działa zarówno w CLI ingestu, jak i w rag-service.
- **Uzasadnienie**:
  - Pozwala uruchomić PoC offline i podczas testów automatycznych.
  - Zachowuje spójność (te same teksty → te same wektory), więc porównania/zapytania są deterministyczne.
  - Ułatwia mockowanie w testach (niskie koszty, brak zewnętrznych zależności).
- **Konsekwencje**:
  - Fallback nie zapewnia semantycznej jakości – traktujemy go tylko jako mechanizm demonstracyjny.
  - Wraz z dostępem do realnych embeddingów należy przeprowadzić ponowną indeksację.
