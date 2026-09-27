/**
 * Seed the corpus into its own Upstash Vector namespace.
 *
 * The corpus has two kinds of documents, and each gets a chunking strategy
 * that matches its structure:
 *
 *  1. Acme Widget API docs (data/corpus/*.md) — short Markdown files.
 *     Every Markdown heading starts a new chunk (section-based chunking).
 *
 *  2. Public standards (data/corpus/standards/*.txt) — IETF RFCs and one
 *     Internet-Draft in their official plain-text format. These are long,
 *     so each numbered section ("4.4.  Client Credentials Grant") becomes a
 *     chunk, and any section longer than RFC_CHUNK_SIZE is split further
 *     with overlap. Page headers/footers and boilerplate sections (status,
 *     copyright, table of contents, references, author addresses) are
 *     removed in memory only. The files on disk stay unmodified, as the
 *     IETF licence requires.
 *
 * Usage:
 *   npm run seed                 embed and upload everything
 *   npm run seed -- --dry-run    show chunk statistics only (no API calls)
 */
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
const DRY_RUN = process.argv.includes('--dry-run');

// Markdown: sections are short, so this limit is only a safety net.
const MD_CHUNK_SIZE = 3000;
const MD_CHUNK_OVERLAP = 400;
// RFCs: sections can be long and dense, so split them into smaller,
// overlapping pieces to keep each vector focused on one idea.
const RFC_CHUNK_SIZE = 1500;
const RFC_CHUNK_OVERLAP = 200;
// Sections shorter than this are merged into the next section instead of
// becoming near-empty chunks.
const MIN_SECTION_CHARS = 80;

type Kind = 'acme' | 'standard';
type Chunk = {
  text: string;
  source: string; // file name shown in citations
  document: string; // human-readable document title
  section: string;
  kind: Kind;
  chunk: number;
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function splitLongText(text: string, size: number, overlap: number): string[] {
  const pieces: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(text.length, i + size);
    if (end < text.length) {
      // Try to end on a sentence boundary shortly after the size limit.
      const lookahead = text.slice(end, end + 300);
      const m = lookahead.match(/[.!?]\s/);
      if (m && m.index !== undefined) end += m.index + 1;
    }
    const piece = text.slice(i, end).trim();
    if (piece) pieces.push(piece);
    if (end >= text.length) break;
    // Step back for overlap, then move forward to a word boundary.
    i = end - overlap;
    const nextSpace = text.slice(i).search(/\s/);
    if (nextSpace > 0 && nextSpace < 40) i += nextSpace + 1;
  }
  return pieces;
}

/** Collect sections, merging very short ones into the following section. */
function buildChunks(
  sections: { section: string; text: string }[],
  meta: { source: string; document: string; kind: Kind },
  size: number,
  overlap: number,
): Chunk[] {
  const chunks: Chunk[] = [];
  let carry = '';
  sections.forEach(({ section, text }, idx) => {
    const combined = [carry, text.trim()].filter(Boolean).join('\n\n');
    if (!combined) return;
    const isLast = idx === sections.length - 1;
    if (combined.length < MIN_SECTION_CHARS && !isLast) {
      carry = combined;
      return;
    }
    carry = '';
    for (const piece of splitLongText(combined, size, overlap)) {
      chunks.push({ ...meta, section, text: piece, chunk: 0 });
    }
  });
  return chunks.map((c, i) => ({ ...c, chunk: i + 1 }));
}

// ---------------------------------------------------------------------------
// Markdown (Acme docs)
// ---------------------------------------------------------------------------

function chunkMarkdown(markdown: string, source: string): Chunk[] {
  const document = path.parse(source).name.replaceAll('_', ' ');
  const sections: { section: string; text: string }[] = [];
  let section = document;
  let lines: string[] = [];
  const flush = () => {
    sections.push({ section, text: lines.join('\n') });
    lines = [];
  };
  for (const line of markdown.replaceAll('\r\n', '\n').split('\n')) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flush();
      section = heading[1].trim();
    } else {
      lines.push(line);
    }
  }
  flush();
  return buildChunks(sections, { source, document, kind: 'acme' }, MD_CHUNK_SIZE, MD_CHUNK_OVERLAP);
}

// ---------------------------------------------------------------------------
// RFC / Internet-Draft plain text (standards)
// ---------------------------------------------------------------------------

// Section headings start at column 0: "4.4.  Client Credentials Grant",
// "Appendix A.  ABNF Syntax", "A.1.  client_id Syntax".
const NUMBERED_HEADING = /^((?:\d+\.)+|Appendix [A-Z]\.|[A-Z]\.(?:\d+\.)*)\s+(\S.{0,110})$/;
// Unnumbered headings such as "Abstract" or "Authors' Addresses".
const PLAIN_HEADING = /^([A-Z][A-Za-z'’ -]{2,60})$/;
// Page furniture repeated on every page of an RFC.
const PAGE_FOOTER = /\[Page \d+\]\s*$/;
const PAGE_HEADER = /^(RFC \d+|Internet-Draft)\s{2,}.*\s{2,}\S+ \d{4}\s*$/;
// Sections that are boilerplate or reference lists — not useful to retrieve.
const SKIP_SECTION =
  /^(Status of This Memo|Copyright Notice|Full Copyright Statement|Intellectual Property|Table of Contents|Authors?'? Address(es)?|Contributors|Acknowledge?ments?|About This Document)$|References|IANA Considerations|Implementation Status/i;

function documentTitle(lines: string[], source: string): string {
  const rfc = lines.find((l) => /^Request for Comments:\s*\d+/.test(l))?.match(/\d+/)?.[0];
  const abstractAt = lines.findIndex((l) => l.trim() === 'Abstract');
  const header = lines.slice(0, abstractAt > 0 ? abstractAt : 40);
  const title = header
    .filter((l) => /^\s{5,}\S/.test(l) && !/^\s*draft-/.test(l))
    .map((l) => l.trim())
    .find((l) => l.length > 5);
  if (rfc && title) return `RFC ${rfc}: ${title}`;
  if (title && /draft-/i.test(source)) return `Internet-Draft (work in progress): ${title}`;
  return title ?? path.parse(source).name;
}

function chunkRfc(raw: string, source: string): Chunk[] {
  const lines = raw
    .replaceAll('\r\n', '\n')
    .replaceAll('\f', '\n')
    .split('\n')
    .filter((l) => !PAGE_FOOTER.test(l) && !PAGE_HEADER.test(l));
  const document = documentTitle(lines, source);

  const sections: { section: string; text: string }[] = [];
  let section = 'Front matter';
  let buffer: string[] = [];
  let seenAbstract = false;
  const flush = () => {
    if (seenAbstract && !SKIP_SECTION.test(section.replace(/^§\S+\s+/, ''))) {
      // Remove the 3-space body indent and collapse runs of blank lines.
      const text = buffer
        .map((l) => l.replace(/^ {3}/, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n');
      sections.push({ section, text });
    }
    buffer = [];
  };

  for (const line of lines) {
    const numbered = line.match(NUMBERED_HEADING);
    const plain = !numbered && line.match(PLAIN_HEADING);
    if (numbered || plain) {
      flush();
      if (plain && line.trim() === 'Abstract') seenAbstract = true;
      section = numbered
        ? `§${numbered[1].replace(/\.$/, '').replace(/^Appendix /, 'App. ')} ${numbered[2].trim()}`
        : line.trim();
      continue;
    }
    buffer.push(line);
  }
  flush();
  return buildChunks(sections, { source, document, kind: 'standard' }, RFC_CHUNK_SIZE, RFC_CHUNK_OVERLAP);
}

// ---------------------------------------------------------------------------
// Load everything
// ---------------------------------------------------------------------------

async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full)));
    else if (/\.(md|txt)$/i.test(entry.name)) files.push(full);
  }
  return files.sort();
}

async function loadCorpus(): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  for (const file of await listFiles(CORPUS_PATH)) {
    const name = path.basename(file);
    const content = await fs.readFile(file, 'utf8');
    chunks.push(...(name.toLowerCase().endsWith('.md') ? chunkMarkdown(content, name) : chunkRfc(content, name)));
  }
  return chunks;
}

function printStats(chunks: Chunk[]) {
  const byFile = new Map<string, Chunk[]>();
  for (const c of chunks) byFile.set(c.source, [...(byFile.get(c.source) ?? []), c]);
  console.log('\nFile                                              Chunks  Avg chars  Max chars');
  for (const [file, list] of byFile) {
    const lens = list.map((c) => c.text.length);
    const avg = Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);
    console.log(`${file.padEnd(50)}${String(list.length).padStart(6)}${String(avg).padStart(11)}${String(Math.max(...lens)).padStart(11)}`);
  }
  const acme = chunks.filter((c) => c.kind === 'acme').length;
  console.log(`\nTotal: ${chunks.length} chunks from ${byFile.size} files (${acme} Acme, ${chunks.length - acme} standards)\n`);
}

async function main() {
  console.log(`Loading and chunking files from ${CORPUS_PATH}…`);
  const chunks = await loadCorpus();
  if (chunks.length === 0) throw new Error(`No .md or .txt documents found in ${CORPUS_PATH}.`);
  printStats(chunks);

  if (DRY_RUN) {
    const sample = chunks.filter((c) => c.kind === 'standard').slice(0, 3);
    for (const c of sample) {
      console.log(`--- ${c.source} | ${c.section} (${c.text.length} chars)\n${c.text.slice(0, 300)}…\n`);
    }
    console.log('Dry run only: nothing was embedded or uploaded.');
    return;
  }

  if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
    throw new Error('Missing UPSTASH_VECTOR_REST_URL / UPSTASH_VECTOR_REST_TOKEN. Set them in .env.local.');
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY in .env.local.');

  console.log('Embedding…');
  const openai = createOpenAIProvider();
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    // Prepend the document title and section so each vector carries its topic.
    values: chunks.map((c) => `${c.document} — ${c.section}\n${c.text}`),
  });

  const index = new Index().namespace(CORPUS_NAMESPACE);
  const records = chunks.map((c, i) => ({
    id: `acme_${path.parse(c.source).name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${c.chunk}`,
    vector: embeddings[i],
    metadata: { text: c.text, source: c.source, document: c.document, section: c.section, kind: c.kind },
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
