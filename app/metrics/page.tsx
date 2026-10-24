import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Binary,
  Cpu,
  Database,
  ExternalLink,
  FileSearch,
  Layers,
  MessageSquareQuote,
  ShieldCheck,
  Swords,
} from 'lucide-react';
import retrieval from '@/evals/results/retrieval.json';
import redteam from '@/evals/results/redteam.json';
import retrievalSet from '@/evals/retrieval-set.json';

export const metadata: Metadata = {
  title: 'Evaluation & Architecture — OmniConnect',
  description: 'Permission-aware RAG, measured with 100 automated use cases.',
};

const CASE_STUDY_URL =
  'https://github.com/rarima-rajeev/Omniconnect---enterprise-knowledge-search-ai-assistant/blob/main/CASE_STUDY.md';

// Every number on this page is read from the eval result files at build time,
// so the page always matches the latest eval run.
type ChunkSet = 'small' | 'medium' | 'full';
const SETS: ChunkSet[] = ['small', 'medium', 'full'];
const SET_LABEL: Record<ChunkSet, string> = { small: '~80 words', medium: '~200 words', full: 'Whole doc' };

const ATTACK_LABEL: Record<string, string> = {
  direct_injection: 'Direct prompt injection',
  indirect_injection: 'Indirect (poisoned document) injection',
  ranking_leak: 'Retrieval / ranking leakage',
  identity_claim: 'Identity claims in the prompt',
  existence_inference: 'Existence inference',
  identity_spoofing: 'Session / identity spoofing',
};

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;

export default function MetricsPage() {
  const bySet = retrieval.bySet as Record<ChunkSet, (typeof retrieval.bySet)['small']>;
  const hard = retrieval.hardBySet as Record<ChunkSet, (typeof retrieval.hardBySet)['small']>;
  const results = redteam.results;
  const attacks = results.filter((r) => r.type !== 'control');
  const controls = results.filter((r) => r.type === 'control');

  const retrievalCount = retrievalSet.length;
  const securityCount = results.length;
  const searches = retrieval.cases.length;
  const leaks = SETS.reduce((n, s) => n + bySet[s].leakedResults, 0);
  const best = retrieval.best as ChunkSet;
  const wouldLeak = bySet[best].wouldHaveLeakedCases / bySet[best].cases;
  const resisted = attacks.filter((r) => r.passed).length;
  const attackTypes = Object.keys(ATTACK_LABEL).map((type) => {
    const rs = attacks.filter((r) => r.type === type);
    return { type, total: rs.length, passed: rs.filter((r) => r.passed).length };
  });
  const maxWords = Math.max(...SETS.map((s) => hard[s].avgContextWords));

  const kpis = [
    {
      value: String(retrievalCount + securityCount),
      label: 'Automated eval use cases',
      detail: `${retrievalCount} retrieval · ${securityCount} security`,
      tone: 'text-white',
    },
    {
      value: String(leaks),
      label: 'Unauthorized documents leaked',
      detail: `across ${searches.toLocaleString()} permission-filtered vector searches`,
      tone: 'text-emerald-400',
    },
    {
      value: `${resisted}/${attacks.length}`,
      label: 'Red-team attacks resisted',
      detail: `${attackTypes.length} attack classes · ${controls.filter((c) => c.passed).length}/${controls.length} authorized controls answered`,
      tone: 'text-emerald-400',
    },
    {
      value: pct(hard[best].answerAt3),
      label: 'Answer recall@3, hard queries',
      detail: `paraphrases, near-duplicates, buried facts · ${SET_LABEL[best]} chunks`,
      tone: 'text-blue-400',
    },
    {
      value: pct(wouldLeak),
      label: 'Searches that would leak unfiltered',
      detail: 'why the access filter runs inside the vector query',
      tone: 'text-amber-400',
    },
  ];

  const pipeline = [
    { icon: ShieldCheck, title: 'Identity', body: 'Signed session → role, department and clearance from the server' },
    { icon: Binary, title: 'Embedding', body: `Query → 768-dim vector (${retrieval.embeddingModel})` },
    { icon: Database, title: 'Permission-aware retrieval', body: 'pgvector cosine search + access filter in one SQL query' },
    { icon: Layers, title: 'Context', body: `Top-${retrieval.k} chunks the user is cleared to read, with citations` },
    { icon: MessageSquareQuote, title: 'Grounded generation', body: `${redteam.model} · structured JSON · cited answers` },
  ];

  const techniques = [
    'Retrieval-Augmented Generation',
    'Vector embeddings',
    'pgvector similarity search',
    'Chunking with overlap',
    'Row-level security',
    'Attribute-based access control',
    'Offline eval harness',
    'Recall@k · MRR',
    'Red teaming',
    'Prompt-injection defense',
    'Structured outputs',
    'Fail-closed design',
  ];
  const stack = ['Next.js 14', 'Supabase Postgres', 'pgvector', 'Gemini embeddings', 'Gemini 2.5 Flash', 'Vercel'];

  return (
    <div className="flex flex-col px-4 sm:px-6 py-3">
      <div className="max-w-6xl w-full mx-auto flex flex-col gap-2.5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Cpu className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">OmniConnect</span>
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900 hover:border-slate-600 text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Try the assistant</span>
            </Link>
            <a
              href={CASE_STUDY_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              <span>Case study</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-blue-400">Evaluation & architecture</div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
            Permission-aware RAG, measured with {retrievalCount + securityCount} automated use cases
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Semantic search that only retrieves what the signed-in employee is cleared to see, evaluated for retrieval
            quality, leakage and adversarial robustness.
          </p>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5">
              <div className={`text-2xl lg:text-3xl font-bold tracking-tight font-mono ${k.tone}`}>{k.value}</div>
              <div className="text-xs font-semibold text-slate-200 mt-1">{k.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{k.detail}</div>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">RAG pipeline</div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {pipeline.map((step, i) => (
              <div key={step.title} className="relative flex sm:block items-start gap-2.5 rounded-lg bg-slate-950/70 border border-slate-800 p-2.5">
                <div className="flex items-center gap-1.5">
                  <step.icon className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-white">
                    {i + 1}. {step.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug sm:mt-1">{step.body}</p>
                {i < pipeline.length - 1 && (
                  <ArrowRight className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Three cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          {/* Chunking experiment */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <FileSearch className="h-4 w-4 text-blue-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chunking experiment</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              {hard[best].scoredCases} hard cases × 3 chunk sizes. Bar = words sent to the model (cost).
            </p>
            <div className="space-y-2">
              {SETS.map((s) => (
                <div key={s}>
                  <div className="flex justify-between text-[11px]">
                    <span className={s === best ? 'text-white font-semibold' : 'text-slate-300'}>
                      {SET_LABEL[s]}
                      {s === best && <span className="ml-1.5 text-emerald-400">chosen</span>}
                    </span>
                    <span className="font-mono text-slate-400">
                      recall {pct(hard[s].answerAt3)} · {hard[s].avgContextWords} words
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s === best ? 'bg-blue-500' : 'bg-slate-600'}`}
                      style={{ width: `${(hard[s].avgContextWords / maxWords) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Red team */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Swords className="h-4 w-4 text-rose-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Red-team coverage</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Auto-scored with canary facts and an independent access oracle.
            </p>
            <div className="space-y-1.5">
              {attackTypes.map((a) => (
                <div key={a.type} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">{ATTACK_LABEL[a.type]}</span>
                  <span className={`font-mono ${a.passed === a.total ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {a.passed}/{a.total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Techniques & stack */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Techniques & stack</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {techniques.map((t) => (
                <span key={t} className="text-[10.5px] px-2 py-0.5 rounded-md border border-blue-500/25 bg-blue-500/10 text-blue-300">
                  {t}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-slate-800">
              {stack.map((t) => (
                <span key={t} className="text-[10.5px] px-2 py-0.5 rounded-md border border-slate-700 bg-slate-800/60 text-slate-300 font-mono">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
