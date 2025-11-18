# Analiza przepływu danych w panelach aplikacji

## 1. "Co nowego" - Dashboard

### 1.1. Strategiczne podsumowanie dla Ciebie

**Źródło danych:**
- **Frontend:** `DashboardPage.tsx` → `useAssistantQuery()` hook
- **API Endpoint:** `POST /assistant/query`
- **Backend Controller:** `AssistantController.query()`
- **Backend Service:** `AssistantService.query()`

**Przepływ danych:**

1. **Frontend (DashboardPage.tsx, linia 22):**
   ```typescript
   mutate({ question: 'Co nowego w tym tygodniu?' })
   ```
   - Automatycznie wywołuje zapytanie przy załadowaniu strony (jeśli brak odpowiedzi)

2. **Hook (useAssistant.ts, linia 18-21):**
   ```typescript
   const api = createApiClient(session?.access_token);
   const { data } = await api.post('/assistant/query', { question });
   ```
   - Wysyła POST z tokenem autoryzacyjnym z Supabase
   - Endpoint: `/assistant/query`

3. **Backend Controller (assistant.controller.ts, linia 13):**
   ```typescript
   query(@CurrentUser() user: AuthenticatedUser, @Body() dto: QueryAssistantDto)
   ```
   - Waliduje użytkownika przez `AuthGuard` (globalny)
   - Pobiera dane użytkownika z tokena Supabase

4. **Backend Service (assistant.service.ts, linia 24-113):**
   
   **Krok 1: Tworzenie/aktualizacja profilu użytkownika (linie 25-47)**
   ```typescript
   const profile = await this.prisma.userProfile.upsert({...})
   ```
   - Tworzy lub aktualizuje `UserProfile` w bazie danych
   - Zawiera: role, email, regions, industries, keywords, detailLevel, responseStyle
   - **Możliwy błąd:** Problem z RLS lub brak uprawnień do zapisu w `user_profile`

   **Krok 2: Wywołanie RAG Service (linie 49-58)**
   ```typescript
   const { data } = await this.client.post("/answer", payload);
   ```
   - Wysyła zapytanie do zewnętrznego serwisu RAG (Python FastAPI)
   - URL: `RAG_SERVICE_URL` (domyślnie `http://localhost:8000`)
   - Timeout: 6000ms (domyślnie)
   - Payload zawiera: `user_profile`, `question`, `from_date`, `to_date`, `language`
   - **Możliwy błąd 500:**
     - RAG service nie jest dostępny (connection refused/timeout)
     - RAG service zwraca błąd (500, 503, etc.)
     - Timeout przekroczony
     - Nieprawidłowa odpowiedź z RAG service (brak wymaganych pól)

   **Krok 3: Zapis logu zapytania (linie 65-78)**
   ```typescript
   const queryLog = await this.prisma.userQueryLog.create({...})
   ```
   - Zapisuje zapytanie do `UserQueryLog`
   - **Możliwy błąd:** Problem z RLS lub brak uprawnień

   **Krok 4: Aktualizacja UserTopicScore (linie 80-100)**
   ```typescript
   await Promise.all(topicIds.map(...))
   ```
   - Aktualizuje scoring tematów dla użytkownika
   - **Możliwy błąd:** Problem z RLS lub nieprawidłowe UUID w topicIds

   **Obsługa błędów (linie 103-113):**
   - Jeśli RAG service nie odpowiada, zwraca fallback response
   - **PROBLEM:** Fallback nie rzuca błędu, więc frontend nie widzi błędu 500
   - Błąd jest tylko logowany, nie propagowany do frontendu

**Dane wyświetlane:**
- `tldr` - podsumowanie strategiczne
- `events[]` - kluczowe wydarzenia
- `actions[]` - rekomendowane działania (title, description)
- `articles[]` - artykuły do przeczytania (id, title, summary, url)
- `topics[]` - powiązane tematy
- `confidence` - poziom pewności odpowiedzi

**Możliwe przyczyny błędu 500:**
1. RAG service nie jest dostępny (najbardziej prawdopodobne)
2. Problem z połączeniem do bazy danych (Prisma)
3. Problem z RLS (Row Level Security) w Supabase/Postgres
4. Błąd w parsowaniu odpowiedzi z RAG service
5. Timeout połączenia z RAG service

---

### 1.2. Puls tematów

**Źródło danych:**
- **Frontend:** `DashboardPage.tsx` → `useTopics()` hook
- **API Endpoint:** `GET /topics?limit=20&offset=0`
- **Backend Controller:** `TopicsController.list()`
- **Backend Service:** `TopicsService.listTopics()`

**Przepływ danych:**

1. **Frontend (DashboardPage.tsx, linia 17):**
   ```typescript
   const { data: topics, isLoading, error } = useTopics();
   ```
   - Hook automatycznie wywołuje zapytanie przy załadowaniu

2. **Hook (useTopics.ts, linia 36-52):**
   ```typescript
   const api = createApiClient(session?.access_token);
   const { data } = await api.get('/topics');
   ```
   - Wysyła GET z tokenem autoryzacyjnym
   - Endpoint: `/topics` (bez parametrów w dashboard, domyślnie limit=20, offset=0)

3. **Backend Controller (topics.controller.ts, linia 12):**
   ```typescript
   list(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryTopicsDto)
   ```
   - Waliduje użytkownika przez `AuthGuard`
   - Parsuje query params (limit, offset, status, search)

4. **Backend Service (topics.service.ts, linia 11-52):**
   
   **Krok 1: Budowanie filtra WHERE (linie 12-18)**
   ```typescript
   const where: Prisma.TopicWhereInput = {};
   if (query.status) where.topicStatus = query.status;
   if (query.search) where.title = { contains: query.search, mode: "insensitive" };
   ```
   - Filtruje tematy po statusie i wyszukiwaniu (jeśli podane)

   **Krok 2: Pobranie tematów z relacją UserTopicScore (linie 23-34)**
   ```typescript
   const [topics, total] = await Promise.all([
     this.prisma.topic.findMany({
       where,
       take: limit,
       skip: offset,
       orderBy: { lastEventAt: "desc" },
       include: {
         userTopicScores: {
           where: { userId: user.userId },
         },
       },
     }),
     this.prisma.topic.count({ where }),
   ]);
   ```
   - Pobiera tematy z bazy `Topic`
   - Dołącza relację `userTopicScores` filtrowaną po `userId`
   - **Możliwy błąd 500:**
     - Problem z RLS w tabeli `Topic` (brak uprawnień do odczytu)
     - Problem z RLS w tabeli `UserTopicScore` (brak uprawnień)
     - Problem z relacją między tabelami
     - Błąd w Prisma query (nieprawidłowa składnia WHERE)
     - `lastEventAt` może być NULL, co może powodować problemy z sortowaniem

   **Krok 3: Mapowanie wyników (linie 39-44)**
   ```typescript
   topics.map((topic) => ({
     ...topic,
     userScore: topic.userTopicScores[0]?.score ?? 0,
     pinned: topic.userTopicScores[0]?.pinned ?? false,
     hidden: topic.userTopicScores[0]?.hidden ?? false,
   }))
   ```
   - Dodaje pola `userScore`, `pinned`, `hidden` na podstawie `userTopicScores`

**Dane wyświetlane:**
- `topics[]` - lista tematów z polami:
  - `id`, `title`, `topicStatus`, `lastEventAt`
  - `userScore` - ważność tematu dla użytkownika (0-∞)
  - `pinned` - czy temat jest przypięty
  - `hidden` - czy temat jest ukryty
- `pagination` - informacje o paginacji (total, limit, offset, hasMore)

**Możliwe przyczyny błędu 500:**
1. Problem z RLS w tabeli `Topic` (brak polityki SELECT dla użytkownika)
2. Problem z RLS w tabeli `UserTopicScore` (brak polityki SELECT)
3. Problem z relacją między `Topic` a `UserTopicScore`
4. Błąd w Prisma query (np. problem z `orderBy` gdy `lastEventAt` jest NULL)
5. Problem z połączeniem do bazy danych

---

### 1.3. Trendy i sygnały

**Źródło danych:**
- **Frontend:** `DashboardPage.tsx` → `assistantResponse?.articles` (linia 138)
- **Dane pochodzą z:** Tego samego zapytania co "Strategiczne podsumowanie"
- **Wyświetla:** Pierwsze 3 artykuły z odpowiedzi asystenta

**Przepływ:**
- Używa danych z `assistantResponse.articles` (te same dane co w sekcji 1.1)
- Jeśli błąd w sekcji 1.1, ta sekcja też będzie pusta/błędna

---

## 2. "Asystent" - ChatPage

### 2.1. Ostatnie źródła

**Źródło danych:**
- **Frontend:** `ChatPage.tsx` → `articles` z `useAssistantQuery()` (linia 12, 114)
- **Dane pochodzą z:** Ostatniej odpowiedzi asystenta w tym widoku
- **Wyświetla:** Pierwsze 5 artykułów z `data.articles`

**Przepływ:**
- Użytkownik zadaje pytanie w formularzu
- Wywołuje `POST /assistant/query` (ten sam endpoint co w dashboard)
- Wyświetla `articles` z odpowiedzi
- Jeśli brak odpowiedzi, sekcja jest pusta

---

## 3. "Tematy" - TopicsPage

### 3.1. Tematy strategiczne

**Źródło danych:**
- **Frontend:** `TopicsPage.tsx` → `useTopics({ limit: 20, offset: page * 20 })`
- **API Endpoint:** `GET /topics?limit=20&offset=0`
- **Backend:** Ten sam endpoint co "Puls tematów" (sekcja 1.2)

**Przepływ:**
- Identyczny jak w sekcji 1.2, ale z paginacją
- Użytkownik może przełączać strony
- Wyświetla pełną listę tematów z możliwością wyboru szczegółów

**Dodatkowe funkcje:**
- Wybór tematu pokazuje szczegóły (`GET /topics/:id`)
- Szczegóły zawierają powiązane dokumenty (max 10)

---

## Diagnoza błędu 500

### Najbardziej prawdopodobne przyczyny:

1. **RAG Service nie jest dostępny** (dla "Strategiczne podsumowanie")
   - Sprawdź czy `RAG_SERVICE_URL` jest poprawnie skonfigurowany
   - Sprawdź czy serwis RAG działa i jest dostępny
   - Sprawdź logi backendu pod kątem błędów połączenia

2. **Problem z RLS w bazie danych** (dla "Puls tematów")
   - Sprawdź polityki RLS w Supabase dla tabel `Topic` i `UserTopicScore`
   - Sprawdź czy użytkownik ma uprawnienia do odczytu
   - Sprawdź czy `auth.uid()` jest poprawnie ustawione w kontekście Prisma

3. **Problem z sortowaniem** (dla "Puls tematów")
   - `orderBy: { lastEventAt: "desc" }` może powodować problemy gdy wiele rekordów ma NULL
   - Możliwe rozwiązanie: `orderBy: [{ lastEventAt: "desc" }, { createdAt: "desc" }]`

### Rekomendacje naprawy:

1. **Dodaj lepszą obsługę błędów w AssistantService:**
   - Rzuć wyjątek zamiast zwracać fallback response
   - Dodaj szczegółowe logowanie błędów

2. **Sprawdź konfigurację RLS:**
   - Upewnij się, że polityki SELECT są włączone dla `Topic`
   - Upewnij się, że polityki SELECT są włączone dla `UserTopicScore`

3. **Popraw sortowanie w TopicsService:**
   - Dodaj fallback sortowanie dla NULL wartości

