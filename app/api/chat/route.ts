/**
 * Chat route handler: streaming RAG with retrieval as a tool call.
 *
 * The model decides when to call the getInformation tool. The tool embeds the
 * query, searches the Acme Widget API corpus in Upstash Vector, and returns
 * each chunk's text, source filename, section heading, and relevance score.
 * The client renders those results as the Sources panel under each answer.
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
      'You are the Acme Widget API reference assistant. Always call the ' +
      'getInformation tool before answering any question about the API, and ' +
      'base your answer only on what it returns. After each key fact, cite the ' +
      'source filename in square brackets, for example [Rate_Limits.md]. If the ' +
      'retrieved sources do not contain the answer, say that the documentation ' +
      'does not cover it instead of guessing. For greetings or questions ' +
      'unrelated to the Acme Widget API, briefly explain what you can help with.',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: recent as any,
    tools: {
      getInformation: tool({
        description:
          'Search the Acme Widget API documentation. Covers authentication ' +
          '(OAuth2, API keys), endpoints (widgets, inventory, orders), pagination ' +
          'and filters, rate limits and HTTP 429, error codes, data formats, ' +
          'timeouts, retries and idempotency, versioning and deprecation, ' +
          'onboarding, and FAQs. Use it for every API question.',
        parameters: z.object({
          query: z
            .string()
            .describe('the topic, term, or sub-question to search for'),
        }),
        execute: async ({ query }) => {
          const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: query,
          });
          const hits = await index.query({
            vector: embedding,
            topK: TOP_K,
            includeMetadata: true,
          });
          return hits.map((h) => ({
            text: (h.metadata?.text as string) ?? '',
            source: (h.metadata?.source as string) ?? 'Unknown source',
            section: (h.metadata?.section as string) ?? 'Unlabeled section',
            score: h.score,
          }));
        },
      }),
    },
    maxSteps: 3,
  });

  return result.toDataStreamResponse({
    getErrorMessage: () =>
      'Sorry, something went wrong while answering. Please try again in a moment.',
  });
}
