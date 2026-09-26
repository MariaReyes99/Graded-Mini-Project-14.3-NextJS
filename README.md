# Acme Widget API Field Guide — RAG Assistant

A public, domain-specific Retrieval-Augmented Generation (RAG) assistant that answers questions about the **Acme Widget API** and shows the documentation sources behind every answer.

Built for **AIM PostGrad Artificial Intelligence — Week 14.3 Graded Mini Project ("Ship Your Own RAG")** by Maria Loisa Reyes, starting from the Week 14 Next.js RAG starter.

**Live app:** https://graded-mini-project-14-3-next-js.vercel.app

## Features

- **Streaming answers** using the Vercel AI SDK (`streamText` + `useChat`).
- **Retrieval as a tool call:** the model calls a `getInformation` tool, which embeds the question and searches Upstash Vector (top 5 chunks).
- **Visible citations:** answers cite source filenames inline, and a **Sources** panel under each answer lists the filename, section heading, relevance score, and retrieved text.
- **Meaningful empty state** with suggested-question chips (stretch goal) and a sidebar of topics.
- **No client-side secrets:** all API keys are read only on the server; `.env*` files are git-ignored.
- **Basic abuse guards** on the public API route: request validation, a 2,000-character question limit, and a cap on conversation history sent to the model.

## Architecture

```
Browser (app/page.tsx, useChat)
   │  POST /api/chat (streamed response)
   ▼
Route handler (app/api/chat/route.ts)
   │  gpt-4o-mini decides to call getInformation
   ▼
getInformation tool
   │  embed query (text-embedding-3-small)
   ▼
Upstash Vector (namespace: acme-widget-api) → top 5 chunks + metadata
```

## The corpus

`data/corpus/` holds 11 Markdown documents derived from the synthetic **Acme Widget API Specification v4.2** supplied with the course starter, plus two internal emails (onboarding and API key deprecation) that add realistic supporting context:

| File | Covers |
| --- | --- |
| `Acme_Widget_API_Overview.md` | Scope, widget data model, base endpoints |
| `Authentication.md` | OAuth2 client credentials, tokens, API keys, rotation |
| `Endpoints.md` | Widgets, inventory, orders, pagination, filters |
| `Rate_Limits.md` | Sliding-window limits, HTTP 429, headers, suspension |
| `Data_Formats.md` | JSON, ISO 8601 dates, money strings, error bodies |
| `Retries_and_Timeouts.md` | Timeouts, idempotency keys, retry policy |
| `Error_Codes.md` | Error code catalog and which errors to retry |
| `Versioning.md` | URL versioning, Sunset headers, breaking-change policy |
| `FAQ.md` | Common questions and short answers |
| `Onboarding_email.md` | Getting-started steps and production checklist |
| `API_Key_Deprecation_Email.md` | Deprecation notice and OAuth2 migration steps |

## Chunking and retrieval choices

- **Section-based chunking:** every Markdown heading starts a new chunk, so each chunk covers one topic (58 chunks, about 350 characters on average). A 3,000-character limit with 400 characters of overlap only applies if a single section grows unusually long. Sections under 80 characters are merged into the next section.
- **Metadata for citations:** each chunk stores its source filename and section heading. These are also prepended to the embedded text, which improved retrieval for authentication questions.
- **topK = 5** balances enough context for multi-part questions against sending irrelevant chunks to the model.

## Run locally

```bash
npm install
cp .env.example .env.local
# set OPENAI_API_KEY, UPSTASH_VECTOR_REST_URL, UPSTASH_VECTOR_REST_TOKEN
# (and OPENAI_BASE_URL if using the Vocareum proxy)

npm run seed   # embeds data/corpus/*.md into Upstash (re-run after corpus changes)
npm run dev    # http://localhost:3000
```

## Deploy

Deployed on Vercel. The same four environment variables must be set in **Vercel → Project → Settings → Environment Variables** for the Production environment. Seeding is done locally once; the deployed app reads from the same Upstash index.

## Demo questions

1. How do I authenticate with OAuth2, and how long does the token last?
2. What happens when I exceed the rate limit, and how should my client respond?
3. Compare OAuth2 and API key authentication.
4. How do I safely retry a POST /v4/orders request without creating a duplicate order?
5. Why might a warehouse be missing from the inventory response?
6. What is the maximum page size when listing widgets?
7. What does error 4001 mean, and should I retry it?
8. How much notice is given before a feature is deprecated?
9. *Out-of-scope check:* Does the Acme API support GraphQL? (The assistant should say the documentation does not cover this.)

## Stretch goals

- **Suggested-prompt chips** on the empty state and in the sidebar.

## Project structure

```
app/
  page.tsx              # Chat UI, empty state, sources panel
  api/chat/route.ts     # Streaming route handler with the retrieval tool
lib/
  seed.ts               # Chunks, embeds, and upserts the corpus
  openai.ts             # OpenAI provider (supports OPENAI_BASE_URL)
data/corpus/            # The 11 Markdown source documents
steps/                  # Workshop reference snapshots (not used by the app)
```
