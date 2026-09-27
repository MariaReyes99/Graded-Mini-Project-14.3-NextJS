/**
 * Chat route handler: streaming RAG with retrieval as a tool call.
 *
 * The model decides when to call the getInformation tool. The tool embeds the
 * query and searches Upstash Vector, optionally limited to one part of the
 * corpus: the Acme Widget API docs, the public standards (IETF RFCs and one
 * Internet-Draft), or both. It returns each chunk's text, source filename,
 * document title, section, and relevance score, which the client renders as
 * the Sources panel under each answer.
 */
import { streamText, tool, embed } from 'ai';
import { Index } from '@upstash/vector';
import { z } from 'zod';
import { createOpenAIProvider } from '../../../lib/openai';

// Allow up to 30 seconds for retrieval plus streaming on Vercel.
export const maxDuration = 30;

const index = new Index().namespace('acme-widget-api');

// Basic guards for a public endpoint, so one visitor cannot run up large costs.
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 12;
const TOP_K = 5;

type IncomingMessage = { role: string; content?: unknown };

export async function POST(req: Request) {
  let body: { messages?: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body.', { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Request must include a non-empty messages array.', { status: 400 });
  }

  const latest = messages[messages.length - 1];
  if (typeof latest.content === 'string' && latest.content.length > MAX_MESSAGE_CHARS) {
    return new Response(
      `Please keep questions under ${MAX_MESSAGE_CHARS} characters.`,
      { status: 413 },
    );
  }

  // Keep only recent history, and make sure it starts with a user message.
  let recent = messages.slice(-MAX_HISTORY_MESSAGES);
  const firstUser = recent.findIndex((m) => m.role === 'user');
  recent = firstUser > 0 ? recent.slice(firstUser) : recent;

  const openai = createOpenAIProvider();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system:
      'You are the Acme Widget API Field Guide. You answer questions about the ' +
      'Acme Widget API and the public internet standards it is built on ' +
      '(OAuth 2.0, Bearer tokens, JWT, HTTP 429, the Sunset header, RFC 3339 ' +
      'timestamps, and the Idempotency-Key header).\n\n' +
      'Rules:\n' +
      '- Always call getInformation before answering a question about the API ' +
      'or these standards, and base your answer only on what it returns.\n' +
      '- For Acme-specific facts (endpoints, limits, error codes, headers Acme ' +
      'uses), search with scope "acme". For how a standard defines something, ' +
      'use scope "standards". Use "both" when the question connects the two.\n' +
      '- Acme documentation is authoritative for how the Acme API behaves. Use ' +
      'the standards to explain background and definitions, and make clear ' +
      'which source says what.\n' +
      '- Cite sources in square brackets after each key fact, using the file ' +
      'name and, for standards, the section, e.g. [Rate_Limits.md] or ' +
      '[rfc6749.txt §4.4].\n' +
      '- The Idempotency-Key document is an Internet-Draft (work in progress), ' +
      'not a finished standard. Say so when you rely on it.\n' +
      '- If the retrieved sources do not contain the answer, say that the ' +
      'documentation does not cover it instead of guessing.\n' +
      '- For greetings or unrelated questions, do not search; briefly explain ' +
      'what you can help with.',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: recent as any,
    tools: {
      getInformation: tool({
        description:
          'Search the Field Guide corpus. scope "acme": the Acme Widget API ' +
          'documentation (authentication, endpoints, pagination, rate limits, ' +
          'error codes, data formats, retries, versioning, onboarding, FAQs). ' +
          'scope "standards": the public specifications behind it: RFC 6749 ' +
          '(OAuth 2.0), RFC 6750 (Bearer tokens), RFC 7519 (JWT), RFC 6585 ' +
          '(HTTP 429), RFC 8594 (Sunset header), RFC 3339 (timestamps) and the ' +
          'Idempotency-Key header Internet-Draft. scope "both" searches everything.',
        parameters: z.object({
          query: z
            .string()
            .describe('the topic, term, or sub-question to search for'),
          scope: z
            .enum(['acme', 'standards', 'both'])
            .describe('which part of the corpus to search'),
        }),
        execute: async ({ query, scope }) => {
          const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: query,
          });
          const filter =
            scope === 'acme'
              ? "kind = 'acme'"
              : scope === 'standards'
                ? "kind = 'standard'"
                : undefined;
          const hits = await index.query({
            vector: embedding,
            topK: TOP_K,
            includeMetadata: true,
            ...(filter ? { filter } : {}),
          });
          return hits.map((h) => ({
            text: (h.metadata?.text as string) ?? '',
            source: (h.metadata?.source as string) ?? 'Unknown source',
            document: (h.metadata?.document as string) ?? '',
            section: (h.metadata?.section as string) ?? 'Unlabeled section',
            score: h.score,
          }));
        },
      }),
    },
    maxSteps: 4,
  });

  return result.toDataStreamResponse({
    getErrorMessage: () =>
      'Sorry, something went wrong while answering. Please try again in a moment.',
  });
}
