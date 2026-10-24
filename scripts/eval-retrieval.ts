// Retrieval eval: for every question x persona x chunk set, does the right document
// come back in the top 3, does a chunk containing the actual answer come back, how much
// text would be sent to the model, and does anything come back the persona may not read?
// Usage: npm run eval:retrieval
import fs from 'fs';
import path from 'path';
import { canRead } from '../lib/access';
import { CHUNK_SETS, ChunkSet } from '../lib/chunking';
import { CorpusDocument, loadCorpus } from '../lib/corpus';
import { EMBEDDING_MODEL, embedTexts } from '../lib/gemini';
import { matchChunks } from '../lib/retrieval';
import { allPersonaUsers } from '../lib/session';

const K = 5;
const OUT_DIR = path.join(process.cwd(), 'evals', 'results');

interface Question {
  id: string;
  difficulty: 'easy' | 'hard';
  question: string;
  relevant: string[];
  answer?: string; // exact string that must appear in a retrieved chunk
}

interface Case {
  questionId: string;
  difficulty: 'easy' | 'hard';
  persona: string;
  chunkSet: ChunkSet;
  expected: string[]; // relevant docs this persona may read
  ranked: string[]; // unique doc ids in rank order
  hit1: boolean | null; // null = nothing relevant is visible to this persona
  hit3: boolean | null;
  rr: number | null;
  answerHit3: boolean | null; // null = no answer string, or not visible to this persona
  contextWords: number; // words in all K chunks, i.e. what the model would read
  leaked: string[]; // returned docs the persona may not read (must be empty)
  wouldHaveLeaked: string[]; // unreadable docs in the unfiltered top-k
}

const uniqueInOrder = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) === i);
const pct = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(1)}%` : 'n/a');
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

async function main() {
  const questions: Question[] = JSON.parse(fs.readFileSync('evals/retrieval-set.json', 'utf8'));
  const docs = new Map<string, CorpusDocument>(loadCorpus().map((d) => [d.id, d]));
  const users = allPersonaUsers();
  const admin = users.find((u) => u.role === 'SystemAdmin')!; // sees everything = unfiltered baseline

  for (const q of questions) for (const id of q.relevant) if (!docs.has(id)) throw new Error(`${q.id}: unknown doc ${id}`);

  console.log(`Embedding ${questions.length} questions with ${EMBEDDING_MODEL}...`);
  const embeddings = await embedTexts(
    questions.map((q) => q.question),
    'RETRIEVAL_QUERY',
  );

  const cases: Case[] = [];
  for (const chunkSet of CHUNK_SETS) {
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      // One query per persona plus the unfiltered baseline, run in parallel.
      const [unfilteredChunks, ...perUser] = await Promise.all(
        [admin, ...users].map((u) => matchChunks(u.userId, embeddings[qi], chunkSet, K)),
      );
      const unfiltered = uniqueInOrder(unfilteredChunks.map((c) => c.documentId));
      users.forEach((user, ui) => {
        const chunks = perUser[ui];
        const ranked = uniqueInOrder(chunks.map((c) => c.documentId));
        const readable = (id: string) => canRead(user, docs.get(id)!);
        const expected = q.relevant.filter(readable);
        const firstHit = ranked.findIndex((id) => expected.includes(id));
        // Only expect the answer if it is in a document this persona may read.
        const answerVisible = !!q.answer && expected.some((id) => docs.get(id)!.body.includes(q.answer!));
        cases.push({
          questionId: q.id,
          difficulty: q.difficulty,
          persona: user.name,
          chunkSet,
          expected,
          ranked,
          hit1: expected.length ? firstHit === 0 : null,
          hit3: expected.length ? firstHit >= 0 && firstHit < 3 : null,
          rr: expected.length ? (firstHit >= 0 ? 1 / (firstHit + 1) : 0) : null,
          answerHit3: answerVisible ? chunks.slice(0, 3).some((c) => c.content.includes(q.answer!)) : null,
          contextWords: chunks.reduce((s, c) => s + words(c.content), 0),
          leaked: ranked.filter((id) => !readable(id)),
          wouldHaveLeaked: unfiltered.filter((id) => !readable(id)),
        });
      });
    }
    console.log(`  ${chunkSet}: done`);
  }

  // ---- Summaries ----
  const summarize = (subset: Case[]) => {
    const scored = subset.filter((c) => c.hit3 !== null);
    const answered = subset.filter((c) => c.answerHit3 !== null);
    return {
      cases: subset.length,
      scoredCases: scored.length,
      hitAt1: scored.filter((c) => c.hit1).length / scored.length,
      hitAt3: scored.filter((c) => c.hit3).length / scored.length,
      mrr: scored.reduce((s, c) => s + (c.rr || 0), 0) / scored.length,
      answerCases: answered.length,
      answerAt3: answered.filter((c) => c.answerHit3).length / answered.length,
      avgContextWords: Math.round(subset.reduce((s, c) => s + c.contextWords, 0) / subset.length),
      leakedResults: subset.reduce((s, c) => s + c.leaked.length, 0),
      wouldHaveLeakedCases: subset.filter((c) => c.wouldHaveLeaked.length).length,
    };
  };
  type Summary = ReturnType<typeof summarize>;

  const forSet = (s: ChunkSet, difficulty?: 'easy' | 'hard') =>
    summarize(cases.filter((c) => c.chunkSet === s && (!difficulty || c.difficulty === difficulty)));
  const bySet = Object.fromEntries(CHUNK_SETS.map((s) => [s, forSet(s)])) as Record<ChunkSet, Summary>;
  const hardBySet = Object.fromEntries(CHUNK_SETS.map((s) => [s, forSet(s, 'hard')])) as Record<ChunkSet, Summary>;
  // Best = finds the answer most often on hard questions, then fewest words sent to the model.
  const best = [...CHUNK_SETS].sort(
    (a, b) => hardBySet[b].answerAt3 - hardBySet[a].answerAt3 || bySet[a].avgContextWords - bySet[b].avgContextWords,
  )[0];
  const byPersona = Object.fromEntries(
    users.map((u) => [u.name, summarize(cases.filter((c) => c.chunkSet === best && c.persona === u.name))]),
  );
  const misses = cases.filter((c) => c.chunkSet === best && (c.hit3 === false || c.answerHit3 === false));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const runAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(OUT_DIR, 'retrieval.json'),
    JSON.stringify({ runAt, embeddingModel: EMBEDDING_MODEL, k: K, bySet, hardBySet, best, byPersona, cases }, null, 2),
  );

  const easyCount = questions.filter((q) => q.difficulty === 'easy').length;
  const setRow = (s: ChunkSet, r: Summary) =>
    `| ${s}${s === best ? ' (best)' : ''} | ${r.scoredCases} | ${pct(r.hitAt1)} | ${pct(r.hitAt3)} | ${r.mrr.toFixed(3)} | ${pct(r.answerAt3)} | ${r.avgContextWords} | ${r.leakedResults} | ${r.wouldHaveLeakedCases} of ${r.cases} |`;
  const header =
    '| Chunk set | Scored cases | Doc Hit@1 | Doc Hit@3 | MRR | Answer in top 3 chunks | Words sent to model | Leaked results | Unfiltered would leak (cases) |\n|---|---|---|---|---|---|---|---|---|';

  const lines = [
    '# Retrieval eval results',
    '',
    `Run ${runAt} · embeddings: ${EMBEDDING_MODEL} (768 dims) · top-${K} chunks per query · ${questions.length} questions (${easyCount} easy, ${questions.length - easyCount} hard) × ${users.length} personas × ${CHUNK_SETS.length} chunk sets`,
    '',
    '- **Doc Hit@k / MRR:** a case is scored only when at least one relevant document is readable by that persona.',
    '- **Answer in top 3 chunks:** the exact answer string appears in one of the first three chunks (hard questions only).',
    '- **Words sent to model:** average words in the top-5 chunks, a proxy for prompt cost and latency.',
    '- **Leaked results:** returned documents the persona may not read, checked against an independent TypeScript copy of the access rule.',
    '- **Unfiltered would leak:** cases that would have surfaced an unreadable document if the permission filter were removed.',
    '',
    '## All questions',
    '',
    header,
    ...CHUNK_SETS.map((s) => setRow(s, bySet[s])),
    '',
    '## Hard questions only (paraphrases, near-duplicates, facts buried in long documents)',
    '',
    header,
    ...CHUNK_SETS.map((s) => setRow(s, hardBySet[s])),
    '',
    `## By persona (${best} chunks, all questions)`,
    '',
    '| Persona | Scored cases | Doc Hit@3 | Answer in top 3 | Leaked results | Unfiltered would leak (cases) |',
    '|---|---|---|---|---|---|',
    ...users.map((u) => {
      const r = byPersona[u.name];
      return `| ${u.name} (${u.role}, ${u.clearanceLevel}) | ${r.scoredCases} | ${pct(r.hitAt3)} | ${pct(r.answerAt3)} | ${r.leakedResults} | ${r.wouldHaveLeakedCases} of ${r.cases} |`;
    }),
    '',
    `## Misses (${best} chunks)`,
    '',
    misses.length ? '| Question | Persona | Expected | Got (top 3 docs) | Doc hit | Answer hit |\n|---|---|---|---|---|---|' : 'None.',
    ...misses.map((c) => {
      const q = questions.find((x) => x.id === c.questionId)!;
      return `| ${q.id}: ${q.question} | ${c.persona} | ${c.expected.join(', ')} | ${c.ranked.slice(0, 3).join(', ')} | ${c.hit3 ? 'yes' : 'no'} | ${c.answerHit3 === null ? '-' : c.answerHit3 ? 'yes' : 'no'} |`;
    }),
    '',
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'retrieval.md'), lines.join('\n'));
  console.log(lines.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
