## 1. High-level architektura systemu

### 1.1. Główne komponenty

1. **Frontend (Portal Asystentów Zarządu)**
   - SPA (np. React) uruchomiona w intranecie / prywatnym VPC.
   - Widoki: dashboard tygodniowy, chat, lista tematów, konfiguracja profilu zainteresowań.
2. **Backend API (Core Service)**
   - Serwis REST/GraphQL (np. Node.js/NestJS lub Python/FastAPI).
   - Odpowiedzialności:
     - Autoryzacja / integracja z SSO.
     - Zarządzanie profilami członków zarządu.
     - Orkiestracja zapytań do: bazy transakcyjnej, bazy wektorowej, LLM.
     - Serwowanie danych do frontu (dashboard, chat, lista tematów).
     - API pomocnicze dla n8n (np. webhooki, zapis metryk, callbacki).
3. **Warstwa LLM / RAG (Knowledge Service)**
   - Mały microservice (np. „rag-service”) z jednym API:
     - `/answer` – przyjmuje pytanie + profil użytkownika → robi retrieval z wektorówki → woła OpenAI Chat → zwraca sformatowaną odpowiedź.
     - `/embed` – wrapper do OpenAI embeddings (dla n8n i backendu).
   - Trzyma logikę promptów systemowych, kontroli halucynacji, formatowania odpowiedzi.
4. **Warstwa danych**
   - **Baza transakcyjna (relacyjna, np. Postgres)**:
     - Użytkownicy, profile zainteresowań.
     - Źródła danych (konfiguracja).
     - Dokumenty logiczne (artykuły, raporty).
     - Tematy (topics) + statusy.
     - Mapowanie user–topic (ważność, ostatni kontakt).
     - Logi biznesowe (co zostało pokazane komu i kiedy).
   - **Baza wektorowa**:
     - Embeddings chunków tekstu (z dokumentów) + metadane (source_id, topic_id, data, tagi, język, itp.).
     - Może to być:
       - Postgres + pgvector (prosto, self-hosted), albo
       - dedykowana wektorówka self-hosted (Qdrant/Weaviate) w VPC.
   - **Storage plików (blob)**:
     - PDF/JPG/HTML w oryginalnej postaci (np. S3-kompatybilny storage wewnątrz VPC).
5. **n8n (orchestrator / ETL / batch jobs)**
   - Self-hosted w tej samej sieci co backend i bazy.
   - Scenariusze:
     - Tygodniowy cron do pobierania i przetwarzania źródeł.
     - Jobs do aktualizacji tematów, statusów, scoringu.
     - Ewentualne scenariusze „cięższych” analiz (np. generowanie miesięcznych raportów).
6. **SSO / IAM / Gateway**
   - Integracja z firmowym IdP (SAML/OIDC).
   - API Gateway / reverse proxy (np. w DMZ) – terminacja TLS, rate limiting, WAF.
7. **Monitoring / logowanie**
   - Centralny system logów (ELK / Loki), metryk (Prometheus), alerting (Alertmanager).
   - Dashboards dla:
     - zdrowia systemu,
     - pipeline’ów n8n,
     - kosztów API (OpenAI),
     - błędów i timeoutów.

### 1.2. Co self-hosted / on-prem / VPC, a co w chmurze?

- **Self-hosted / VPC (w sieci korporacyjnej lub prywatnej chmurze):**
  - Frontend, backend, rag-service.
  - n8n.
  - Baza transakcyjna, baza wektorowa, blob storage.
  - Monitoring, logi, secrets manager.
- **W chmurze (poza organizacją):**
  - OpenAI API (chat + embeddings) – dostęp wyłącznie po HTTPS, z IP allowlist (ew. przez egress gateway).
  - Opcjonalnie: managed monitoring jeśli firma na to pozwala.

------

### 1.3. Przepływ danych – tygodniowa aktualizacja wiedzy (a)

1. **n8n – Cron (np. niedziela 03:00)**
   - Wywołuje workflow „Weekly Knowledge Refresh”.
2. **Pobranie konfiguracji źródeł**
   - Node „Postgres -> Select” pobiera z bazy listę aktywnych źródeł:
     - typ: RSS / HTTP API / HTML / plik / wewnętrzny system,
     - endpoint/URL,
     - parametry,
     - ostatnio pobrany znacznik czasu / ID.
3. **Iteracja po źródłach**
   - `Split In Batches` – dla każdego źródła:
     - HTTP Request (zewnętrzny) lub dedykowany node (wewnętrzny) → pobranie surowych danych.
     - Funkcja czyszcząca (Function node): wyciągnięcie listy artykułów/raportów (tytuł, treść, data, autor, link, itp.).
4. **Dedup & upsert dokumentu logicznego**
   - `Postgres -> Select`: sprawdzenie, czy już mamy dokument o tym samym canonical_url lub hash(treść).
   - IF:
     - jeśli istnieje → aktualizacja (status „zaktualizowany”),
     - jeśli nie → INSERT (status „nowy”).
5. **Chunkowanie i embeddings**
   - Funkcja (Function): dzieli treść dokumentu na chunki (np. 500–1000 tokenów z overlap).
   - HTTP Request do `rag-service /embed` (który wewnętrznie woła OpenAI embeddings).
   - Node DB: zapis chunków + embeddingów do bazy wektorowej (upsert).
6. **Przypisanie dokumentu do tematu (topic)**
   - n8n:
     - HTTP Request do `rag-service /classify-topic` lub lokalna logika:
       - pobranie embeddingu dokumentu,
       - zapytanie do wektorówki o podobne tematy (embedding centroidów),
       - jeśli cos_sim > threshold → przypisanie do tematu,
       - jeśli nie → utworzenie nowego tematu.
   - Node DB: update `topic_id` w dokumencie, ew. insert nowego topicu.
7. **Aktualizacja metryk tematu**
   - Node DB:
     - inkrementuje licznik dokumentów dla tematu,
     - update `last_event_at`,
     - odświeża `topic_status` (w uproszczeniu: nowy/rosnący/stabilny/wygasły).
8. **Logowanie / metryki**
   - Node Function + HTTP (lub dedykowany node):
     - Zapis do systemu logów: ile dokumentów pobrano, ile nowych, ile zaktualizowanych, ile błędów.
     - Parametry per źródło (do SLA).

------

### 1.4. Przepływ danych – interakcja użytkownika (b)

1. **Wejście na URL: `https://asystent/assistant/{user_slug}`**
   - Użytkownik loguje się przez SSO.
   - Frontend otrzymuje token JWT (IdP), przekazuje go w nagłówkach do backendu.
2. **Backend – autoryzacja**
   - Weryfikacja tokena (podpis, aud, exp).
   - Mapowanie `sub` / email → `user_id` w bazie.
   - Sprawdzenie roli („BOARD_MEMBER”).
3. **Pobranie profilu użytkownika**
   - Backend odczytuje `UserProfile` (obszary, regiony, branże, preferencje, styl odpowiedzi).
4. **Użytkownik wpisuje pytanie „Co nowego w tym tygodniu?”**
   - Front wysyła `POST /assistant/query`:
     - `user_id`,
     - `question`,
     - ew. dodatkowe parametry (okres, język, itp.).
5. **Backend → rag-service /answer**
   - Backend buduje request:
     - `user_profile` (zredukowany do najważniejszych pól),
     - `question`,
     - kontekst czasowy (np. `from_date = now-7d`),
     - preferowany output format.
6. **rag-service – retrieval & RAG**
   - Tworzy embedding pytania (OpenAI embeddings).
   - Query do wektorówki:
     - filtry metadanych (date>=from_date, topics przypisane do użytkownika, regiony, branże, itp.),
     - top-k chunków + przypisane dokumenty/tematy.
   - Grupuje wyniki per temat.
   - Tworzy „context bundle”:
     - skróty dokumentów (tytuł, TL;DR, data, źródło),
     - najważniejsze akapity,
     - statusy tematów i trend (rosnący/stabilny).
7. **rag-service – wywołanie OpenAI Chat**
   - System prompt:
     - styl odpowiedzi (krótko/długo, bullet/narracja),
     - struktura:
       - `TL;DR`,
       - `Kluczowe wydarzenia`,
       - `Artykuły do przeczytania`,
       - `Rekomendowane działania`.
     - wyraźna instrukcja „odpowiadaj wyłącznie w oparciu o kontekst; jeśli brak danych – powiedz o tym”.
   - Assistant prompt: kontekst (skrócony, ale z metadanymi).
   - User prompt: pytanie użytkownika.
8. **Post-processing odpowiedzi**
   - rag-service weryfikuje, czy odpowiedź trzyma strukturę (regex / JSON Schema).
   - Opcjonalnie: drugi, lekki „validator prompt” sprawdzający, czy odpowiedź nie zawiera danych spoza kontekstu.
9. **Zapis historii**
   - Backend zapisuje:
     - metadane zapytania (user_id, timestamp, topic_ids użyte w kontekście),
     - skróconą wersję odpowiedzi (bez nadmiarowego PII).
   - Log techniczny: czas, liczba tokenów, koszt, ewentualne błędy.
10. **Odpowiedź do frontu**
    - Front wyświetla sekcje (akordeony / karty) + listę artykułów do przeczytania z linkami.
    - Użytkownik może:
      - „oznaczyć przeczytane”,
      - „oznaczyć ważne / nieważne” → backend aktualizuje scoring tematów dla tego użytkownika.

------

## 2. Model danych i źródła informacji

### 2.1. Typy źródeł

**Zewnętrzne:**

- RSS / Atom z:
  - portali branżowych,
  - regulatorów (np. nadzór finansowy),
  - instytucji badawczych.
- HTTP API newsowe (agregatory wiadomości, serwisy analityczne).
- Crawlowane www (HTML → tekst):
  - oficjalne komunikaty konkurencji,
  - blogi eksperckie, portale branżowe.
- Raporty branżowe (PDF) – pobierane okresowo z określonych URL/FTP.

**Wewnętrzne:**

- Wewnętrzny intranet / portal firmowy (aktualności, ogłoszenia).
- Repozytoria dokumentów (np. foldery sieciowe, DMS) – notatki z zarządu, raporty wewnętrzne, prezentacje.
- Systemy BI / raportowania (tylko metadane + linki, niekoniecznie surowe dane liczbowo).

*(Źródła wewnętrzne integrujemy z poszanowaniem istniejących uprawnień – w razie potrzeby: dedykowany serwis, który dostarcza tylko to, co zarząd ma prawo zobaczyć.)*

------

### 2.2. Struktura danych (główne encje)

**Source**

- `source_id`
- `type` (rss/api/html/pdf/internal_dms/…)
- `name`
- `base_url`
- `auth_config` (odniesienie do sekretów)
- `default_language`
- `refresh_interval` (domyślnie 7d)
- `last_fetched_at`

**RawDocument**

- `raw_id`
- `source_id`
- `fetched_at`
- `raw_location` (ścieżka w blob storage)
- `content_hash`

**Document** (logiczy artykuł/raport)

- `doc_id`
- `source_id`
- `canonical_url`
- `title`
- `author`
- `published_at`
- `ingested_at`
- `lang`
- `doc_type` (news/raport/notatka_z_zarzadu/inne)
- `summary` (krótki abstrakt)
- `status` (nowy/zaktualizowany/archiwalny)
- `topic_id` (nullable, dopóki nie przypiszemy)

**ChunkEmbedding**

- `chunk_id`
- `doc_id`
- `chunk_index`
- `text` (fragment)
- `embedding` (vector)
- `created_at`
- `metadata` (JSON – np. `{"source":"X", "region":"EU", "industry":"banking"}`)

**Topic** (wątek tematyczny)

- `topic_id`
- `title` (robocza nazwa, np. „Dyrektywa XXX – wymogi kapitałowe”)
- `description` (krótki opis generowany przez LLM)
- `created_at`
- `last_event_at`
- `topic_status` (new/growing/stable/expired)
- `tags` (JSON array – reglamentacje, konkurenci, produkty, rynki)
- `centroid_embedding` (vector) – średnia z dokumentów przypisanych do tematu.

**UserProfile**

- `user_id`
- `role` (np. CEO, CFO, CRO…)
- `regions` (lista kodów krajów / regionów)
- `industries`
- `competitors_watchlist`
- `keywords_include`
- `keywords_exclude`
- `detail_level` (low/medium/high)
- `response_style` (short/long, bullets/narrative)
- `language` (pl/en)
- `source_prefs` (np. „wewnętrzne priorytetowo”, „bez social media”)

**UserTopicScore**

- `user_id`
- `topic_id`
- `score` (float)
- `last_seen_at`
- `interactions_count`
- `pinned` (bool)
- `hidden` (bool)

------

### 2.3. Deduplikacja, podobieństwo, aktualizacje tej samej sprawy

1. **Deduplikacja dokumentu:**
   - Klucze:
     - canonical_url (jeśli jest),
     - lub `content_hash` (hash normalizowanego tekstu).
   - Jeśli nowe pobranie ma ten sam canonical_url / hash:
     - aktualizacja `published_at`/`summary`, zachowanie historii zmian.
2. **Wykrywanie podobieństwa dokumentów:**
   - Na poziomie dokumentu:
     - embedding całego tekstu (lub średnia z chunków) → wektorowe zapytanie w „document_embeddings” (osobna kolekcja).
     - cos_sim > 0.9 → duże podobieństwo → traktujemy jako duplikat/wersję.
3. **„Ta sama sprawa” (topic):**
   - Używamy embeddingu dokumentu:
     - query do `topics` (centroid_embedding),
     - cos_sim > T1 (np. 0.8) → przypisanie do istniejącego tematu,
     - T0 < cos_sim <= T1 → flagowanie do ręcznego review (opcjonalnie),
     - ≤ T0 → utworzenie nowego tematu.
   - Okresowo (np. raz w miesiącu) job „merging topics”:
     - łączy tematy o bardzo podobnych centroidach i tagach.

------

## 3. Silnik wiedzy i kontekstu (RAG + pamięć długoterminowa)

### 3.1. Wykorzystanie embeddings + bazy wektorowej

- **Wyszukiwanie semantyczne**:
  - Każde pytanie użytkownika → embedding.
  - Zapytanie do wektorówki:
    - filtr: daty, regiony, branże, preferowane źródła, lista topic_id z wysokim `UserTopicScore`.
    - top-k (np. 30 chunków) z różnych dokumentów.
- **Grupowanie tematów**:
  - Off-line job (n8n albo batch job backendu):
    - pobiera embeddingi tematów,
    - wykonuje proste klastrowanie (np. HDBSCAN/KMeans uruchamiane poza n8n) – do wyższych „meta-tematów” jeśli potrzebne.
- **Aktualizowanie „wątku” w czasie**:
  - Za każdym razem, gdy nowy dokument dopięty jest do tematu:
    - centroid_embedding = uśrednienie embeddingów dokumentów.
    - update `last_event_at`, `topic_status`.
  - Wątki są więc ciągłą, żywą „historią sprawy”.

### 3.2. Strategia RAG

1. **Krok retrieval**:
   - query embedding (pytanie + profil użytkownika we wstępie, np. „CEO banku, interesują go: regulacje kapitałowe, ESG”).
   - filtry w wektorówce (metadata).
   - top-k chunków + ich dokumenty + powiązane tematy.
2. **Budowa kontekstu dla modelu**:
   - Dla każdego tematu, który się pojawia:
     - generujemy krótki „topic brief” (wcześniej wyliczony i cache’owany; aktualizowany przez n8n przy nowych dokumentach).
   - Kontekst =
     - `UserProfile summary`,
     - 5–10 „topic briefs” (z datami, statusami, trendem),
     - top 20–30 fragmentów tekstu (najbardziej trafne).
3. **Ograniczanie halucynacji**:
   - System prompt wymusza:
     - „Odpowiadaj tylko na podstawie dostarczonego kontekstu, nie zgaduj”.
     - „Gdy brakuje informacji – wyraźnie to zaznacz”.
   - Dodatkowy „confidence score”:
     - jeśli suma relevancji z wektorówki < próg → informujemy użytkownika, że wiedza jest ograniczona.
   - Opcjonalny drugi prompt (validator) – sprawdzający spójność odpowiedzi z kontekstem.
4. **Pamięć długoterminowa (per użytkownik)**:
   - Po każdej odpowiedzi:
     - generujemy mini-sumę Q&A (np. „Weekly digest 2025-W46 – CFO”).
     - zapisujemy ją jako osobny Document typu `user_summary` + embedding.
   - Przy pytaniach „co nowego od ostatniego razu?”:
     - retrieval także po tych `user_summary`, dzięki czemu asystent pamięta, co już omawiał z daną osobą.

------

## 4. Personalizacja asystenta dla każdego członka zarządu

### 4.1. Struktura profilu użytkownika (przykład)

```
{
  "user_id": "cfo-123",
  "role": "CFO",
  "regions": ["PL", "EU"],
  "industries": ["banking", "fintech"],
  "competitors_watchlist": ["Bank A", "Bank B"],
  "keywords_include": ["MREL", "ESG", "IFRS", "cyber risk"],
  "keywords_exclude": ["retail marketing", "HR events"],
  "detail_level": "high",
  "response_style": {
    "length": "short",
    "format": "bullets",
    "language": "pl"
  },
  "source_prefs": {
    "internal_priority": true,
    "exclude_social": true
  }
}
```

- Przechowywane w Postgres:
  - tabela `user_profile` z kolumnami prostymi + `settings` jako JSONB.

### 4.2. Wpływ profilu na system

1. **Wybór dokumentów do indeksacji (opcjonalna optymalizacja)**
   - Principal: indeksujemy wszystko, ale dla bardzo dużych strumieni można:
     - oznaczać dokumenty jako „relevant_for_user_X” na podstawie reguł (tagi, regiony) i używać tego jako filtra retrieval.
2. **Filtrowanie i ranking wyników**
   - Wektorówka:
     - filtr na `region`, `industry`, `source_type`, `topic_tags` zgodne z profilem.
   - Ranking:
     - score = α * cos_sim + β * UserTopicScore + γ * recency_weight.
   - Źródła „niepożądane” (np. social) – odfiltrowane.
3. **Generowanie rekomendacji: „co przeczytać”, „co zrobić dalej”**
   - n8n job „Weekly Recommendations”:
     - dla każdego usera wybiera top N tematów z najwyższym score,
     - wewnątrz tematów top artykuły z ostatnich 7–14 dni,
     - generuje (przez LLM) 2–3 sugestie działania (np. „Poproś dział prawny o analizę…”, „Zwołaj spotkanie nt…”).
   - Wynik trafia do tabeli `user_recommendations` i jest wyświetlany w dashboardzie.

------

## 5. Mechanizm tygodniowej aktualizacji wiedzy (n8n – cron)

### 5.1. Przykładowy workflow n8n: „Weekly Knowledge Refresh”

**Nody (po kolei):**

1. **Cron**
   - Raz w tygodniu (np. niedziela, 03:00).
2. **Postgres (Get Sources)**
   - Query: `SELECT * FROM sources WHERE active = true`.
3. **Split In Batches (Sources)**
   - Iteruje po źródłach.
4. **IF (Source Type)**
   - branch RSS → HTTP Request (RSS)
   - branch API → HTTP Request (API)
   - branch HTML → HTTP Request (HTML page)
   - branch INTERNAL → Webhook/HTTP do wewnętrznego serwisu
5. **Function (Normalize Response)**
   - Wejście: surowe dane z HTTP.
   - Wyjście: tablica „articles” o strukturze:
     - `title`, `content_html/text`, `published_at`, `url`, `author`, `tags`.
6. **Split In Batches (Articles)**
   - Iteruje po artykułach.
7. **Function (Clean & Extract Text)**
   - Usuwa HTML, reklamy, stopki.
   - Wynik: `clean_text`.
8. **Postgres (Check Duplicate)**
   - Query: czy istnieje dokument z tym `canonical_url` lub hash(clean_text).
9. **IF (Is New)**
   - Tak → Postgres Insert Document.
   - Nie → Update Document (status „updated”).
10. **Function (Chunking)**
    - Dzieli `clean_text` na chunki.
11. **HTTP Request (rag-service /embed)**
    - Body: tablica chunków → wektor embeddings.
12. **Upsert embeddings do wektorówki**
    - Node HTTP (jeśli wektorówka ma API) lub Postgres (pgvector).
13. **HTTP Request (rag-service /assign-topic)**
    - Wejście: `doc_id` + embedding dokumentu.
    - Wyjście: `topic_id` (istniejący lub nowy).
14. **Postgres (Update Topic Metrics)**
    - Update: `last_event_at`, `documents_count`.
15. **Function (Set Topic Status)**
    - Prosta logika: jeśli `documents_count_last_30d` > próg & rośnie → „growing”, itd.
16. **Postgres (Update Topic Status)**
17. **Prometheus Pushgateway / Log Node**
    - Zapis metryk: liczba dokumentów per źródło, błędów, avg time per article.

### 5.2. Metryki / logi

- Na poziomie workflow’a:
  - liczba uruchomień, czas trwania.
- Na poziomie źródła:
  - ile dokumentów pobranych, ile nowych, ile zaktualizowanych.
  - ile błędów HTTP, ile timeoutów.
- Na poziomie embeddingów:
  - liczba wezwań API OpenAI, średni koszt (liczba tokenów).
- Alerty:
  - brak nowych danych ze źródła X > N dni,
  - wzrost błędów 5xx,
  - wzrost czasu trwania pipeline’u powyżej progu.

------

## 6. Workflow interakcji użytkownika z asystentem

### 6.1. Szczegółowo: zapytanie → odpowiedź

1. **User → Front**

   - Wpisuje pytanie.

   - Front wysyła:

     ```
     POST /assistant/query
     {
       "question": "Co nowego w tym tygodniu w moim obszarze?",
       "context": {"timeframe": "last_week"}
     }
     ```

2. **Front → Backend (z JWT)**

   - Nagłówek `Authorization: Bearer <token>`.

3. **Backend – auth & profil**

   - Waliduje token, mapuje `user_id`.
   - Odczytuje `UserProfile`.
   - Określa timeframe (jeśli nie podany) np. `from_date = now-7d`.

4. **Backend → rag-service /answer**

   - Request:

     ```
     {
       "user_profile": {...},
       "question": "...",
       "from_date": "2025-11-10",
       "to_date": "2025-11-17"
     }
     ```

5. **rag-service – retrieval**

   - Embedding pytania.
   - Query do wektorówki z filtrami.
   - Top 30 chunków + info o dokumentach + tematach.

6. **rag-service – przygotowanie promptu**

   - Buduje:
     - system prompt ze stylem, strukturą odpowiedzi, zasadami bezpieczeństwa.
     - context prompt: `topic briefs` + listy artykułów (tytuł, data, krótki opis).
     - user prompt = pytanie.

7. **rag-service → OpenAI Chat**

   - Odbiera odpowiedź w strukturze np. JSON (przez odpowiedni prompt).

8. **rag-service – postprocessing**

   - Waliduje JSON.
   - W razie potrzeby poprawia format (np. drugi call do LLM z zadaniem „napraw JSON wg schematu”).

9. **Backend – logowanie biznesowe**

   - Zapis do `user_query_log`:
     - user_id, czas, `topic_ids` użyte w kontekście, `from_date`, `to_date`.
   - Zapis skrótu odpowiedzi (bez wrażliwych danych, jeśli niekonieczne).

10. **Backend → Front**

    - Zwraca gotowe sekcje:
      - `tldr`,
      - `events`,
      - `articles`,
      - `actions`.

11. **Front – prezentacja**

    - UI:
      - karta „TL;DR”,
      - lista „Top 3–5 wydarzeń”,
      - sekcja „Co przeczytać”,
      - sekcja „Proponowane działania”.
    - Akcje użytkownika (przeczytane / ważne / nieistotne) → `POST /assistant/feedback`.

12. **Feedback → aktualizacja scoringu tematów**

    - Backend / n8n:
      - inkrementuje `interactions_count`,
      - modyfikuje `UserTopicScore`.

------

## 7. Logika tematów / wątków i statusów

### 7.1. Powiązywanie artykułów z tematem

- Przy ingest:
  - nowy dokument → embedding → query do `Topic.centroid_embedding` → przypisanie wg progu.
- Okresowo:
  - job „recluster topics” – usuwa tematy z 1–2 dokumentami, dołącza je do sąsiednich klastrów.

### 7.2. Statusy tematów (przykładowa heurystyka)

Na podstawie liczby dokumentów w ostatnich oknach czasu:

- **nowy** – pierwszy dokument w ostatnich 14 dniach.
- **rosnący** – liczba dokumentów w ostatnich 30 dniach > w poprzednich 30 d. o X% (np. 50%).
- **stabilny** – regularnie pojawiają się dokumenty, ale bez silnego trendu wzrostowego.
- **wygasły** – brak nowych dokumentów > 90 dni.

Job n8n „Update Topic Status”:

1. Cron (raz w tygodniu).
2. DB: zlicza dokumenty per topic w oknach czasowych.
3. Function: wylicza status wg reguł.
4. DB: update `topic_status`.

### 7.3. Model scoringu ważności tematu dla użytkownika

Prosty, praktyczny scoring:

- Dla usera U i topicu T:
  - **BaseScore(T)** – globalna ważność tematu:
    - `w1 * log(1 + doc_count_last_30d) + w2 * recency_factor`
  - **ProfileScore(U,T)** – dopasowanie do profilu:
    - +punkty za zgodność tagów tematu z `regions`, `industries`, `competitors_watchlist`, `keywords_include`,
    - −punkty za tagi z `keywords_exclude`.
  - **InteractionScore(U,T)** – zachowanie użytkownika:
    - +punkty za „oznaczone jako ważne”,
    - −punkty za „ukryj temat”,
    - +funkcja malejąca czasu od `last_seen_at`.
- `TotalScore(U,T) = α * BaseScore + β * ProfileScore + γ * InteractionScore`.

------

## 8. Bezpieczeństwo, prywatność, separacja danych

### 8.1. Separacja danych / multi-tenancy

- Zakładamy **jeden tenant = jedna organizacja**, ale:
  - twarde rozdzielenie danych na poziomie użytkownika:
    - `user_id` jako obowiązkowy filtr we wszystkich zapytaniach (RBAC + RLS w Postgres).
    - Row-Level Security w Postgres na tabelach `user_query_log`, `user_topic_score`, `user_recommendations`.
- Brak możliwości „podejrzenia” historii pytań innych członków zarządu przez UI ani przez API.

### 8.2. Szyfrowanie danych

- **W tranzycie** – wszędzie HTTPS/TLS 1.2+ (frontend → backend → n8n → LLM).
- **W spoczynku**:
  - szyfrowanie dysków baz danych (TDE lub szyfrowanie na poziomie storage),
  - szyfrowanie blob storage,
  - wrażliwe pola (np. pełne treści notatek z zarządu) dodatkowo szyfrowane aplikacyjnie (np. AES-GCM z kluczem z KMS).

### 8.3. Zarządzanie kluczami API i sekretami

- Centralny **secrets manager** (np. Vault).
- n8n:
  - korzysta z Credentials, ale same wartości sekretów trzymane w zewnętrznym magazynie jeśli to możliwe.
- Backend / rag-service:
  - pobierają klucze z KMS przy starcie, nie logują ich nigdy.

### 8.4. Audyt i logowanie

- Logi techniczne:
  - user_id (pseudonim), timestamp, typ operacji, źródło błędu, liczba tokenów.
  - Bez przechowywania pełnych treści pytań i odpowiedzi w logach – tylko skróty / ID.
- Audyt:
  - tabela `audit_log`: kto i kiedy:
    - logował się do systemu,
    - zmieniał profil,
    - zmieniał konfigurację źródeł.
- Zgodność z RODO:
  - retencja:
    - np. pytania/odpowiedzi max 12–24 miesiące (policy do ustalenia),
    - logi techniczne z pseudonimowaniem.
  - prawo do bycia zapomnianym:
    - mechanizm: job kasujący dane użytkownika:
      - wiersze w `user_profile`, `user_topic_score`, `user_query_log`, `user_recommendations`.
    - embeddings i dokumenty, które nie zawierają danych osobowych tego użytkownika, mogą pozostać (dane systemowe).

### 8.5. Uwierzytelnianie i autoryzacja

- **SSO**:
  - OIDC/SAML z firmowym IdP.
  - Role przekazywane w tokenie (np. claim `roles`).
- **Autoryzacja**:
  - Role: `BOARD_MEMBER`, `ADMIN`, `SECURITY_OFFICER`.
  - Policy: `BOARD_MEMBER` ma dostęp tylko do swojego asystenta.
  - `ADMIN` – konfiguracja źródeł, ale nie wgląd w treść Q&A (lub tylko z maskowaniem, zależnie od polityk).

### 8.6. Przykładowe zagrożenia i mitigacja

- **Nieautoryzowany dostęp do danych zarządu**
  - Mitigacja: SSO, MFA, RLS, audyt logowań, segmentacja sieci.
- **Wycieki przez logi / monitoring**
  - Mitigacja: maskowanie payloadów, nie logowanie treści pytań, regularny przegląd logów.
- **Prompt injection z zewnętrznych źródeł**
  - Mitigacja:
    - stripowanie poleceń w kontekście (np. „ignore previous instructions”),
    - traktowanie treści zewnętrznych jako cytatów, nie jako instrukcji.
- **Ataki na n8n (np. przejęcie workflow)**
  - Mitigacja:
    - izolacja n8n w VPC,
    - dostęp tylko po VPN/SSO,
    - RBAC w n8n,
    - przegląd workflowów pod kątem bezpieczeństwa.
- **Nadużycia API OpenAI (koszty, dane wrażliwe)**
  - Limit rate, budżetu, monitorowanie użycia.
  - Konfiguracja OpenAI z opcją „no training” / minimalizacja logowania po stronie dostawcy.

------

## 9. Front-end i dostęp przez osobne URL-e

### 9.1. Architektura front-endu

- SPA (React/Vue) hostowana w intranecie, serwowana z reverse proxy.
- Routing:
  - `/assistant/{user_slug}` – główny widok asystenta (slug mapowany po stronie backendu na `user_id` + weryfikacja, że to ten sam użytkownik co w tokenie).
  - `/admin/sources` – konfiguracja źródeł (tylko ADMIN).
  - `/settings/profile` – ustawienia profilu zainteresowań (dla użytkownika).

### 9.2. Widoki

1. **Dashboard „Co nowego w tym tygodniu”**
   - Sekcja TL;DR (2–3 akapity).
   - Karty „Kluczowe tematy”:
     - nazwa tematu, status (nowy/rosnący/stabilny/wygasły),
     - liczba nowych artykułów,
     - przycisk „pokaż szczegóły”.
2. **Wyszukiwarka / chat z asystentem**
   - Pole tekstowe, historia Q&A (po stronie przeglądarki + ewentualnie z serwera).
   - Możliwość filtrowania po czasie (ostatni tydzień/miesiąc/rok) i typie źródeł.
3. **Lista tematów / wątków**
   - Tabela / lista:
     - nazwa tematu, status, ostatnia aktywność, ważność (score),
     - akcje: przypnij/ukryj, przejdź do szczegółów.
4. **Konfiguracja obszarów zainteresowań**
   - UI do wyboru:
     - regionów, branż, konkurentów, słów kluczowych, stylu odpowiedzi.
   - Zmiany wysyłane do backendu → update `UserProfile`.

------

## 10. Szczegółowy plan wdrożenia (fazy)

### Faza 0 – Discovery & PoC (1–2 asystentów, ograniczone źródła) – ok. 4–6 tyg.

**Cele:**

- Sprawdzenie jakości odpowiedzi i UX.
- Minimalny zestaw źródeł (np. 3 zewnętrzne RSS + 1 wewnętrzny intranet).
- 1–2 członków zarządu (np. CEO, CFO).

**Kroki:**

1. Warsztaty z zarządem (zakres, priorytety).
2. Wybór źródeł danych pilotażowych.
3. Setup środowiska dev/test: backend, n8n, Postgres, wektorówka.
4. Prosty RAG (bez zaawansowanych tematów/statusów).
5. Prosty frontend (chat + prosty dashboard).
6. Testy funkcjonalne i bezpieczeństwa (basic).
7. Pilotaż z 1–2 osobami.

**Role:**

- Product Owner, Solution Architect, 1×Backend dev, 1×Frontend dev, 1×Data/LLM engineer, 1×Security/Compliance, 1×DevOps/n8n.

------

### Faza 1 – MVP produkcyjne dla zarządu (3–5 osób) – ok. 6–8 tyg.

**Cele:**

- Stabilne środowisko produkcyjne.
- Obsługa większości członków zarządu.
- Tygodniowe odświeżanie danych.

**Kroki:**

1. Hardening architektury (SSO, RLS, monitoring).
2. Rozbudowa modelu danych (topics, UserTopicScore).
3. Implementacja workflowów n8n dla tygodniowej aktualizacji.
4. Implementacja dashboardu „co nowego” + listy tematów.
5. Ustalenie polityk RODO (retencja, logi).
6. Testy penetracyjne / security review.
7. Uruchomienie MVP na produkcji.

------

### Faza 2 – Skalowanie (więcej użytkowników, więcej źródeł, integracje wewnętrzne) – ok. 8–12 tyg.

**Cele:**

- Skalowanie do CAŁEGO zarządu + ewentualnie „top management”.
- Większa liczba źródeł (więcej raportów, integracje z systemami wewnętrznymi).

**Kroki:**

1. Dodanie nowych źródeł (kolejne RSS/API, repozytoria wewnętrzne).
2. Optymalizacja wektorówki i baz (indeksy, sharding jeśli potrzebny).
3. Rozszerzenie scoringu tematów, rekomendacji.
4. Wydzielanie rag-service jako osobnego skalowalnego microserwisu.
5. Automatyzacja raportów miesięcznych/kwartalnych (n8n).

------

### Faza 3 – Udoskonalenia (rekomendacje działań, zaawansowana analityka) – ciągłe

**Cele:**

- „Actionable insights” – asystent nie tylko raportuje, ale sugeruje scenariusze decyzyjne.
- Zaawansowane analizy trendów (np. timeline tematów, wykresy).

**Kroki:**

1. Rozbudowa promptów i modeli analitycznych (np. LLM + proste modele statystyczne).
2. Dashboard analityczny trendów tematów (BI).
3. Integracja z kalendarzem / task managerem (tworzenie follow-upów).
4. Ciągłe doskonalenie bezpieczeństwa i governance (AI policy, MRM).

------

## 11. Rekomendowane narzędzia i stack

- **Backend**:
  - Node.js + NestJS / Python + FastAPI – wybór wg standardu w organizacji.
- **Frontend**:
  - React (TypeScript), SPA, komunikacja przez REST/GraphQL.
- **Baza transakcyjna**:
  - Postgres (JSONB + RLS).
- **Baza wektorowa**:
  - Postgres + pgvector (na start)
  - lub Qdrant/Weaviate self-hosted jeśli potrzebna większa skala.
- **Storage plików**:
  - S3-kompatybilny (MinIO lub cloud S3 w prywatnym VPC).
- **n8n**:
  - self-hosted, z dostępem do Postgresa, rag-service i internet (przez proxy).
- **Monitoring / logi**:
  - Prometheus + Grafana, Loki/ELK, Alertmanager.
- **Zarządzanie sekretami**:
  - Vault / natywne rozwiązanie chmurowe (KMS + Secret Manager).
- **Crawlowanie**:
  - n8n + proste funkcje HTTP/Function,
  - ewentualnie dedykowany crawler (Scrapy) jeśli będą trudniejsze strony.

------

## 12. Szacunkowe koszty i zespół

### 12.1. Zespół minimalny na start (Faza 0–1)

- 1× Product Owner.
- 1× Solution/AI Architect (może też Security na początku).
- 1× Backend dev.
- 1× Frontend dev.
- 1× Data/LLM Engineer.
- 1× DevOps / Platform Engineer (w tym n8n).
- 0.5× Security/Compliance (udział okresowy).

### 12.2. Koszty miesięczne (szacunek jakościowy)

- **OpenAI API**:
  - Dla zarządu (kilka osób, kilkaset zapytań miesięcznie + embeddings tygodniowo) – raczej **niski / dolna część średniego**.
- **Infrastruktura (bazy, hostingi, monitoring)**:
  - Self-hosted w istniejącej infrastrukturze – **niski do średniego**.
  - Jeśli osobne klastry / dedykowane zasoby – **średni**.
- **Ludzie / utrzymanie i rozwój**:
  - W praktyce największy składnik kosztowy – **średni / wysoki**, zależnie od tego, czy to główny projekt zespołu, czy jeden z wielu.

------

## 13. Checklista „gotowości do uruchomienia pilotażu”

1. **Architektura & infra**
   -  Backend i rag-service działają w środowisku testowym.
   -  n8n zintegrowany z bazami i rag-service.
   -  Postgres + wektorówka skonfigurowane (w tym backupy).
2. **Bezpieczeństwo**
   -  Integracja z SSO działa, role użytkowników poprawnie mapowane.
   -  RLS w bazie włączone i przetestowane.
   -  Szyfrowanie w tranzycie (HTTPS) i w spoczynku (storage, DB) aktywne.
   -  Klucze API i sekrety przechowywane w centralnym secrets managerze.
   -  Przeprowadzony podstawowy audyt bezpieczeństwa / testy penetracyjne.
3. **Dane i RAG**
   -  Co najmniej kilka źródeł zewnętrznych i 1–2 wewnętrzne poprawnie się aktualizują (workflow n8n).
   -  Dokumenty są deduplikowane, chunkowane, embedowane.
   -  Tematy (topics) tworzą się i aktualizują statusy.
   -  Retrieval z wektorówki zwraca sensowne fragmenty w testach.
4. **Asystent (LLM)**
   -  Prompt systemowy i struktura odpowiedzi przetestowane, odpowiedzi są zrozumiałe i trzymają format.
   -  Mechanizmy ograniczania halucynacji działają (testy z pytaniami spoza kontekstu).
   -  Logowanie pytań/odpowiedzi w wersji zanonimizowanej działa.
5. **Personalizacja**
   -  Profile członków zarządu skonfigurowane (obszary, regiony, styl odpowiedzi).
   -  Filtry i scoring tematów realnie różnicują odpowiedzi dla różnych profili.
6. **Frontend / UX**
   -  Dashboard „co nowego w tym tygodniu” działa i pokazuje realne dane.
   -  Chat z asystentem działa end-to-end (logowanie → pytanie → odpowiedź).
   -  Widok listy tematów i konfiguracji profilu jest dostępny i stabilny.
7. **Operacje i utrzymanie**
   -  Monitoring (metryki, logi, alerty) skonfigurowany.
   -  Runbook dla zespołu (co zrobić przy błędach, jak restartować workflowy n8n).
   -  Określona polityka RODO: retencja, proces „bycia zapomnianym”.
8. **Akceptacja biznesowa**
   -  Co najmniej 1–2 członków zarządu przetestowało system i zaakceptowało jako pilotaż.
   -  Zdefiniowane KPI pilotażu (np. częstotliwość korzystania, satysfakcja, przydatność rekomendacji).