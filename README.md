# HN Reader — Smart Hacker News Client

A Hacker News client with AI-powered discussion summaries, bookmarking, and search.
Built with Next.js, Express, MySQL, and Ollama (local LLM).

---

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Git

### 1. Clone and start
```bash
git clone <your-repo-url>
cd hn-reader
docker-compose up --build
```

### 2. Pull the AI model (first time only)

Open a second terminal after containers are running:
```bash
docker exec -it hn_ollama ollama pull llama3.2:1b
```

This downloads ~1.3GB and only needs to be done once.
The model persists in a Docker volume across restarts.

### 3. Open the app
```
http://localhost:3000
```

### 4. Verify backend is healthy
```
http://localhost:4000/health
```

Expected response: `{"status":"ok"}`

---

## Tech Stack

| Layer          | Choice                  | Why                                                                 |
|----------------|-------------------------|---------------------------------------------------------------------|
| Frontend       | Next.js 15 (App Router) | RSC for fast feed rendering, Client Components for interactivity    |
| Backend        | Node.js + Express       | Lightweight, zero ceremony — only 6 endpoints needed                |
| Database       | MySQL 8                 | Simple relational model, production-representative, easy to inspect |
| AI             | Ollama (llama3.2:1b)    | Free, runs locally, no API key needed, self-contained               |
| Infrastructure | Docker Compose          | Single command setup, all services containerized                    |

---

## Architecture
```
┌─────────────────────────────────────────┐
│           Next.js Frontend              │
│  App Router + Tailwind CSS              │
│  SSE for streaming AI progress          │
└────────────────┬────────────────────────┘
                 │ HTTP REST + SSE
┌────────────────▼────────────────────────┐
│         Express Backend API             │
│  /api/hn/*          → HN Firebase API  │
│  /api/bookmarks     → MySQL CRUD       │
│  /api/summarize/:id → Ollama (SSE)     │
└──────┬──────────────────────┬───────────┘
       │                      │
┌──────▼──────┐    ┌──────────▼──────────┐
│    MySQL    │    │   Ollama Container  │
│  bookmarks  │    │   llama3.2:1b       │
└─────────────┘    └─────────────────────┘
              HN Firebase API
           (fetched server-side)
```

---

## Features

- **Feed** — Top, New, Best stories from Hacker News with pagination
- **Comment Tree** — Full nested threaded comments with collapse/expand
- **Bookmarks** — Save and remove stories, persisted in MySQL
- **Search** — Filter bookmarks by title or author
- **AI Summary** — Summarize any discussion using a local LLM with live progress updates

---

## Approach & Key Decisions

### 1. SSE for AI Summarization (not a simple POST)

The summarization is handled via Server-Sent Events instead of a regular POST request.

The frontend opens a GET SSE connection to `/api/summarize/:storyId`.
The backend then fetches the story and comments from HN directly,
processes them, calls Ollama, and streams progress back step by step:
```
Frontend                       Backend
   |                              |
   |-- GET /api/summarize/:id --> |
   |                              | 1. fetch story from HN
   |<-- event: status ----------- |
   |                              | 2. fetch comments from HN
   |<-- event: status ----------- |
   |                              | 3. flatten + truncate comments
   |<-- event: status ----------- |
   |                              | 4. call Ollama
   |<-- event: status ----------- |
   |                              | 5. parse + validate response
   |<-- event: done + result ---- |
```

This approach solves two problems:
- Avoids sending large comment payloads from frontend to backend (no request size limits)
- Gives the user live feedback during the 60-120 second local LLM processing time

### 2. Backend fetches comments for summarization

The frontend never sends comment data to the summarize endpoint.
The backend fetches everything directly from the HN Firebase API.
This keeps the API clean and avoids HTTP body size limits entirely.

### 3. Prompt design for small models

llama3.2:1b is a small model that struggles with complex instructions.
The prompt is designed to be extremely explicit:
- Shows the exact JSON structure expected as an example in the prompt
- Uses `format: "json"` in the Ollama API call to force JSON mode
- Sets temperature to 0.1 for deterministic, structured output
- A 4-strategy JSON extractor handles cases where the model adds extra text

### 4. Comment tree depth limiting

The HN API returns comment IDs recursively. Fetching every comment on a
popular story could mean thousands of API calls. The backend limits to:
- Max depth of 3 levels
- Max 15 comments per level
- Top 10 comments passed to the LLM
- Input truncated to 4000 characters

This keeps response times reasonable without losing the key discussion points.

### 5. Data model — store metadata only

The bookmarks table stores only story metadata (title, score, author, comment count).
Full story and comment data is always fetched fresh from HN.
This keeps the database minimal and avoids stale content issues.
```sql
CREATE TABLE bookmarks (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  story_id      INT NOT NULL UNIQUE,
  title         VARCHAR(500) NOT NULL,
  url           VARCHAR(1000),
  author        VARCHAR(255),
  score         INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

| Method | Endpoint                     | Description                          |
|--------|------------------------------|--------------------------------------|
| GET    | `/api/hn/stories/:type`      | Fetch top/new/best stories           |
| GET    | `/api/hn/item/:id`           | Fetch story + full comment tree      |
| GET    | `/api/bookmarks`             | List all bookmarks                   |
| GET    | `/api/bookmarks/search?q=`   | Search bookmarks by title or author  |
| POST   | `/api/bookmarks`             | Save a bookmark                      |
| DELETE | `/api/bookmarks/:storyId`    | Remove a bookmark                    |
| GET    | `/api/summarize/:storyId`    | Stream AI summary progress via SSE   |

---

## Running Tests

Tests cover all backend API endpoints with mocked dependencies.
```bash
cd backend
npm test
```

### Test coverage

**Bookmarks (`bookmarks.test.js`)**
- Returns list of bookmarks
- Returns empty array when no bookmarks
- Returns empty array when search query is missing
- Searches bookmarks by query string
- Creates a bookmark successfully
- Returns 400 when story_id is missing
- Returns 400 when title is missing
- Deletes a bookmark successfully

**HN API (`hn.test.js`)**
- Returns stories for valid feed type
- Returns 400 for invalid feed type
- Returns story with comments
- Returns 404 for non-existent story

**Summarize SSE (`summarize.test.js`)**
- Streams status events and returns done event with valid summary
- Streams error event when story is not found
- Streams error event when story has no comments
- Handles Ollama timeout gracefully (ECONNABORTED)
- Handles Ollama connection refused gracefully (ECONNREFUSED)

---

## Tradeoffs

**Ollama over cloud API**
Free and fully self-contained but slow on CPU (60-120s per summary).
A production system would use a GPU-backed instance or a cloud API
like Anthropic Claude or OpenAI GPT-4o. The async SSE design means
swapping the AI provider is a one-line change in `summarize.js`.

**SSE over WebSockets**
SSE is simpler for this use case — it is unidirectional (server to client)
and works over plain HTTP with no extra libraries. WebSockets would only
be needed if the client needed to send data mid-stream.

**No Redis caching**
HN API calls are made fresh on every request. A 5-minute TTL cache on
story feeds and comment trees would significantly reduce latency and
external API load in production.

**Synchronous Ollama call inside SSE handler**
The backend awaits the full Ollama response before sending the done event.
A true streaming implementation would pipe Ollama's token stream directly
to the SSE response, showing the summary word by word as it generates.

**MySQL over SQLite**
Slightly heavier Docker setup but more representative of a real production
stack and easier to inspect with external tools like HeidiSQL.

**MySQL port 3308 on host**
Mapped to 3308 instead of the default 3306 to avoid conflicts with local
MySQL installations. Container-to-container communication still uses 3306.

---

## What I'd Add With More Time

- Redis caching for HN API responses (5 min TTL on feeds, 10 min on stories)
- True token-level streaming from Ollama to frontend (word-by-word output)
- Background job queue with BullMQ + Redis for summarization
- Comment read/unread tracking per story
- Story filtering by minimum score, domain, or date range
- Rate limiting on the summarize endpoint to prevent abuse
- Proper React error boundaries on the frontend
- End-to-end tests with Playwright covering the full user flows

---

## Assumptions

- No authentication required — single user app as specified
- Comments fetched fresh on each visit — caching not required at this scope
- Ollama model pull is a one-time manual step after first `docker-compose up`
- No multi-user support needed — bookmarks are global to the single instance