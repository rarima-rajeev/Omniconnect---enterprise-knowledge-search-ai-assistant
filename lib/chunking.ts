import { CorpusDocument } from './corpus';

export type ChunkSet = 'small' | 'medium' | 'full';

export interface ChunkConfig {
  maxWords: number;
  overlapWords: number;
}

// Three chunk sizes so the retrieval eval can compare them. "full" is the
// no-chunking baseline: one chunk per document.
export const CHUNK_CONFIGS: Record<ChunkSet, ChunkConfig> = {
  small: { maxWords: 80, overlapWords: 15 },
  medium: { maxWords: 200, overlapWords: 30 },
  full: { maxWords: 5000, overlapWords: 0 },
};

export const CHUNK_SETS = Object.keys(CHUNK_CONFIGS) as ChunkSet[];

export interface Chunk {
  id: string;
  documentId: string;
  chunkSet: ChunkSet;
  chunkIndex: number;
  content: string;
  wordCount: number;
}

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

// Paragraphs are the packing unit. A "## " heading is kept attached to the paragraph
// that follows it, and a paragraph longer than the limit is split into sentences.
function units(body: string, maxWords: number): string[] {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const merged: string[] = [];
  for (const p of paragraphs) {
    const last = merged[merged.length - 1];
    if (last && /^##\s/.test(last) && !last.includes('\n')) merged[merged.length - 1] = `${last}\n${p}`;
    else merged.push(p);
  }
  return merged.flatMap((p) =>
    countWords(p) <= maxWords ? [p] : p.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)!.map((s) => s.trim()),
  );
}

// Packs paragraphs into chunks of up to maxWords, carrying the last overlapWords of
// each chunk into the next. Every chunk starts with the document title so a chunk
// read on its own still says what it is about.
export function chunkDocument(doc: CorpusDocument, chunkSet: ChunkSet): Chunk[] {
  const { maxWords, overlapWords } = CHUNK_CONFIGS[chunkSet];
  const chunks: Chunk[] = [];
  let parts: string[] = [];
  let words = 0;
  let previousTail = '';

  const flush = () => {
    if (!parts.length) return;
    const text = parts.join('\n\n');
    const body = previousTail ? `...${previousTail}\n\n${text}` : text;
    chunks.push({
      id: `${doc.id}::${chunkSet}::${chunks.length}`,
      documentId: doc.id,
      chunkSet,
      chunkIndex: chunks.length,
      content: `${doc.title}\n\n${body}`,
      wordCount: countWords(body),
    });
    previousTail = overlapWords ? text.split(/\s+/).slice(-overlapWords).join(' ') : '';
    parts = [];
    words = 0;
  };

  for (const unit of units(doc.body, maxWords)) {
    const n = countWords(unit);
    if (words + n > maxWords) flush();
    parts.push(unit);
    words += n;
  }
  flush();
  return chunks;
}
