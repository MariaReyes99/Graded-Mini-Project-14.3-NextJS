/**
 * Final Route Handler — Step 4 of Section 4 (RAG-as-tool-call) +
 * the source metadata used by Step 5's UI.
 *
 * The model decides whether to call the getInformation tool. When it does,
 * the tool runs vector search and returns chunk text + page + score. The
 * client renders those as collapsible file and section citations.
 */
import { streamText, tool, embed } from 'ai';
import { Index } from '@upstash/vector';
import { z } from 'zod';
import { createOpenAIProvider } from '../../../lib/openai';

const index = new Index().namespace('acme-widget-api');

export async function POST(req: Request) {
  const { messages } = await req.json();
  const openai = createOpenAIProvider();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system:
      'You are the Acme Widget API reference assistant. Use the getInformation ' +
      'tool for every substantive question about the API. Ground answers in ' +
      'retrieved sources, identify relevant source sections, and say when the ' +
      'corpus does not contain enough information instead of guessing.',
    messages,
    tools: {
      getInformation: tool({
        description:
          'Search the indexed Acme Widget API documentation for facts about authentication, endpoints, rate limits, errors, data formats, retries, or versioning. Use this for substantive API questions.',
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
            topK: 5,
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

  return result.toDataStreamResponse();
}
