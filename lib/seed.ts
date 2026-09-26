/** Seed the Acme Widget API Markdown corpus into its own Upstash namespace. */
import { config as loadEnv } from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

// Next.js reads .env.local automatically; this script does not.
loadEnv({ path: path.join(process.cwd(), '.env.local') });
import { Index } from '@upstash/vector';
import { embedMany } from 'ai';
import { createOpenAIProvider } from './openai';

const CORPUS_PATH = path.join(process.cwd(), 'data', 'corpus');
const CORPUS_NAMESPACE = 'acme-widget-api';
// Chunking is section-based: every Markdown heading starts a new chunk.
// CHUNK_SIZE only splits a section that is unusually long, with CHUNK_OVERLAP
// characters repeated between the pieces so no sentence loses its context.
const CHUNK_SIZE = 3000;
const CHUNK_OVERLAP = 400;
// Sections shorter than this (e.g. a lone "Supported methods:" line) are
// merged into the next section instead of becoming a near-empty chunk.
const MIN_SECTION_CHARS = 80;

type Chunk = { text: string; source: string; section: string; chunk: number };

function chunkSection(text: string, source: string, section: string): Chunk[] {
  const chunks: Chunk[] = [];
  let i = 0;
  let chunk = 1;
  while (i < text.length) {
    let end = Math.min(text.length, i + CHUNK_SIZE);
    if (end < text.length) {
      const lookahead = text.slice(end, end + 500);
      const m = lookahead.match(/[.!?]\s/);
      if (m && m.index !== undefined) end += m.index + 1;
    }
    const piece = text.slice(i, end).trim();
    if (piece.length > 0) chunks.push({ text: piece, source, section, chunk });
    if (end >= text.length) break;
    i = end - CHUNK_OVERLAP;
    chunk += 1;
  }
  return chunks;
}

function chunkMarkdown(markdown: string, source: string): Chunk[] {
  const chunks: Chunk[] = [];
  let section = path.parse(source).name.replaceAll('_', ' ');
  let lines: string[] = [];
  let carryOver = '';

  const flushSection = (isLast = false) => {
    const text = [carryOver, lines.join('\n').trim()].filter(Boolean).join('\n\n');
    lines = [];
    if (!text) return;
    if (text.length < MIN_SECTION_CHARS && !isLast) {
      carryOver = text;
      return;
    }
    carryOver = '';
    chunks.push(...chunkSection(text, source, section));
  };

  for (const line of markdown.replaceAll('\r\n', '\n').split('\n')) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flushSection();
      section = heading[1].trim();
    } else {
      lines.push(line);
    }
  }
  flushSection(true);
  return chunks.map((chunk, index) => ({ ...chunk, chunk: index + 1 }));
}

async function loadCorpus(): Promise<Chunk[]> {
  const files = (await fs.readdir(CORPUS_PATH, { withFileTypes: true }))
    .filter((file) => file.isFile() && file.name.toLowerCase().endsWith('.md'))
    .map((file) => file.name)
    .sort();

  const chunks: Chunk[] = [];
  for (const file of files) {
    const markdown = await fs.readFile(path.join(CORPUS_PATH, file), 'utf8');
    chunks.push(...chunkMarkdown(markdown, file));
  }
  return chunks;
}

async function main() {
  if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
    console.error('Missing UPSTASH_VECTOR_REST_URL / UPSTASH_VECTOR_REST_TOKEN. Set them in .env.local.');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY in .env.local.');
    process.exit(1);
  }

  console.log(`Loading and chunking Markdown files from ${CORPUS_PATH}…`);
  const chunks = await loadCorpus();
  if (chunks.length === 0) {
    throw new Error(`No Markdown documents found in ${CORPUS_PATH}.`);
  }
  console.log(`  produced ${chunks.length} chunks from ${new Set(chunks.map((c) => c.source)).size} files`);

  console.log('Embedding…');
  const openai = createOpenAIProvider();
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    values: chunks.map((c) => `${c.source} - ${c.section}\n${c.text}`),
  });

  const index = new Index().namespace(CORPUS_NAMESPACE);
  const records = chunks.map((c, i) => ({
    id: `acme_${path.parse(c.source).name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${c.chunk}`,
    vector: embeddings[i],
    metadata: { text: c.text, source: c.source, section: c.section },
  }));

  await index.delete({ prefix: 'acme_' });
  console.log(`Upserting ${records.length} chunks to Upstash Vector…`);
  // Upsert in batches to stay well within Upstash request limits.
  const BATCH = 100;
  for (let i = 0; i < records.length; i += BATCH) {
    await index.upsert(records.slice(i, i + BATCH));
  }
  console.log('✅ Done. Run `npm run dev` and chat at http://localhost:3000');
}

main().catch((error: unknown) => {
  const statusCode =
    typeof error === 'object' && error !== null && 'statusCode' in error
      ? error.statusCode
      : undefined;
  if (typeof statusCode === 'number') {
    console.error(`Seeding failed with HTTP ${statusCode}. Check your API key and OPENAI_BASE_URL.`);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Seeding failed. Check the environment configuration and the files in data/corpus.');
  }
  process.exit(1);
});
