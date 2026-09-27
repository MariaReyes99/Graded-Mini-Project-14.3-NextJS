# Acme Widget API Field Guide — RAG Assistant

A public, domain-specific Retrieval-Augmented Generation (RAG) assistant that answers questions about the **Acme Widget API** and the **public internet standards it is built on** (OAuth 2.0, Bearer tokens, JWT, HTTP 429, the Sunset header, RFC 3339 timestamps and the Idempotency-Key header). Every answer shows the sources behind it.

Built for **AIM PostGrad Artificial Intelligence — Week 14.3 Graded Mini Project ("Ship Your Own RAG")** by Maria Loisa Reyes, starting from the Week 14 Next.js RAG starter.

**Live app:** https://graded-mini-project-14-3-next-js.vercel.app

## Features

- **Streaming answers** using the Vercel AI SDK (`streamText` + `useChat`).
- **Retrieval as a tool call:** the model calls a `getInformation` tool with a query and a **scope** (`acme`, `standards` or `both`). The tool embeds the query and searches Upstash Vector with a metadata filter, returning the top 5 chunks.
- **Visible citations:** answers cite sources inline (e.g. `[Rate_Limits.md]` or `[rfc6749.txt §4.4]`), and a **Sources** panel under each answer, labelled with the scope searched, lists the filename, section, relevance score and retrieved text.
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

The corpus has two parts (18 documents).

**1. Acme Widget API documentation** (`data/corpus/*.md`, 11 files), derived from the synthetic *Acme Widget API Specification v4.2* supplied with the course starter, plus two internal emails that add realistic supporting context:

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

**2. Public standards behind the API** (`data/corpus/standards/*.txt`, 7 files), in their official IETF plain-text format:

| File | Document | Supports |
| --- | --- | --- |
| `rfc6749.txt` | RFC 6749 — The OAuth 2.0 Authorization Framework | Authentication |
| `rfc6750.txt` | RFC 6750 — OAuth 2.0 Bearer Token Usage | Authentication |
| `rfc7519.txt` | RFC 7519 — JSON Web Token (JWT) | Authentication |
| `rfc6585.txt` | RFC 6585 — Additional HTTP Status Codes (429) | Rate limits |
| `rfc8594.txt` | RFC 8594 — The Sunset HTTP Header Field | Versioning |
| `rfc3339.txt` | RFC 3339 — Date and Time on the Internet: Timestamps | Data formats |
| `draft-ietf-httpapi-idempotency-key-header-07.txt` | The Idempotency-Key HTTP Header Field (Internet-Draft, **work in progress**) | Retries |

**Attribution.** RFCs and Internet-Drafts are © IETF Trust and the persons identified as the document authors, obtained from [rfc-editor.org](https://www.rfc-editor.org) and [ietf.org](https://www.ietf.org). They are included in full and without modification, as permitted by the IETF Trust Legal Provisions (BCP 78). The Idempotency-Key document is an Internet-Draft, a work in progress rather than a published standard.

## Chunking and retrieval choices

Each part of the corpus is chunked to match its structure:

- **Acme Markdown docs — section-based.** Every Markdown heading starts a new chunk, so each chunk covers one topic. Sections are short, so the 3,000-character limit (400 overlap) is only a safety net.
- **RFCs — numbered-section-based with size limits.** Each numbered section (e.g. `4.4.  Client Credentials Grant`) becomes a chunk, and sections longer than 1,500 characters are split with 200 characters of overlap. Page headers and footers and boilerplate sections (status, copyright, table of contents, references, author addresses, IANA registrations) are removed **in memory only**; the files on disk stay unmodified.
- **Short sections** (under 80 characters) are merged into the next section rather than becoming near-empty chunks.
- **Metadata for citations and filtering:** each chunk stores its file name, document title, section and `kind` (`acme` or `standard`). The title and section are also prepended to the embedded text. `kind` powers the tool's `scope` filter, so Acme-specific questions are not crowded out by long RFC text.
- **topK = 5** per search. The model can search twice (for example, Acme docs and then standards) before answering.

Check the chunking without calling any APIs:

```bash
npm run seed -- --dry-run
```

## Run locally

```bash
npm install
cp .env.example .env.local
# set OPENAI_API_KEY, UPSTASH_VECTOR_REST_URL, UPSTASH_VECTOR_REST_TOKEN
# (and OPENAI_BASE_URL if using the Vocareum proxy)

npm run seed   # embeds data/corpus (Markdown + RFC text) into Upstash; re-run after corpus changes
npm run dev    # http://localhost:3000
```

## Deploy

Deployed on Vercel. The same four environment variables must be set in **Vercel → Project → Settings → Environment Variables** for the Production environment. Seeding is done locally once; the deployed app reads from the same Upstash index.

## Demo questions

Acme API:

1. How do I authenticate with OAuth2, and how long does the token last?
2. What happens when I exceed the rate limit, and how should my client respond?
3. How do I safely retry a POST /v4/orders request without creating a duplicate order?
4. What does error 4001 mean, and should I retry it?

Standards and how Acme uses them:

5. What does the OAuth 2.0 standard say about the client credentials grant?
6. Acme returns HTTP 429. How does RFC 6585 define that status code?
7. What claims can a JWT contain, such as the expiration claim?
8. Is Idempotency-Key an official standard?
9. How does the Sunset header in RFC 8594 relate to Acme's deprecation policy?

Out of scope (should say the documentation does not cover it):

10. Does the Acme API support GraphQL?

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
data/corpus/            # 11 Acme Markdown documents
  standards/            # 7 IETF RFCs / Internet-Draft (unmodified)
steps/                  # Workshop reference snapshots (not used by the app)
```
