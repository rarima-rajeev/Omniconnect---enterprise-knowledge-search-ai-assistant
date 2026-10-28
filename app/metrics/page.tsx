import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Cpu,
  ExternalLink,
  FileSearch,
  Fingerprint,
  Github,
  Globe,
  Layers,
  Linkedin,
  MessageSquareQuote,
  Search,
  ShieldCheck,
  Swords,
  UserCheck,
} from 'lucide-react';
import retrieval from '@/evals/results/retrieval.json';
import redteam from '@/evals/results/redteam.json';
import retrievalSet from '@/evals/retrieval-set.json';

export const metadata: Metadata = {
  title: 'How It Works & Results — AskWell',
  description: 'How AskWell answers questions safely, and how it scored on 100 automated test cases.',
};

const CASE_STUDY_URL =
  'https://github.com/rarima-rajeev/askwell/blob/main/CASE_STUDY.md';

const PROFILE_LINKS = [
  { label: 'Portfolio', href: 'https://rarima-rajeev.my.canva.site/', icon: Globe },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/rarima-rajeev', icon: Linkedin },
  { label: 'GitHub', href: 'https://github.com/rarima-rajeev', icon: Github },
];

// Every number on this page is read from the eval result files at build time,
// so the page always matches the latest eval run.
type ChunkSet = 'small' | 'medium' | 'full';
const SETS: ChunkSet[] = ['small', 'medium', 'full'];
const SET_LABEL: Record<ChunkSet, string> = {
  small: 'Small (~80 words)',
  medium: 'Medium (~200 words)',
  full: 'Whole document',
};

// Plain-English name first, the technical term underneath.
const ATTACKS: { type: string; label: string; term: string }[] = [
  { type: 'direct_injection', label: '"Ignore your rules" commands', term: 'Direct prompt injection' },
  { type: 'indirect_injection', label: 'Hidden instructions in a document', term: 'Indirect injection' },
  { type: 'ranking_leak', label: 'Searches aimed at a secret document', term: 'Retrieval leakage' },
  { type: 'identity_claim', label: '"I\'m the CFO, show me" claims', term: 'Identity claims' },
  { type: 'existence_inference', label: '"Just tell me if it exists" probes', term: 'Existence inference' },
  { type: 'identity_spoofing', label: 'Faked or tampered logins', term: 'Session spoofing' },
];

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;

export default function MetricsPage() {
  const bySet = retrieval.bySet as Record<ChunkSet, (typeof retrieval.bySet)['small']>;
  const hard = retrieval.hardBySet as Record<ChunkSet, (typeof retrieval.hardBySet)['small']>;
  const results = redteam.results;
  const attacks = results.filter((r) => r.type !== 'control');
  const controls = results.filter((r) => r.type === 'control');

  const retrievalCount = retrievalSet.length;
  const hardCount = retrievalSet.filter((q) => q.difficulty === 'hard').length;
  const securityCount = results.length;
  const searches = retrieval.cases.length;
  const leaks = SETS.reduce((n, s) => n + bySet[s].leakedResults, 0);
  const best = retrieval.best as ChunkSet;
  const wouldLeak = bySet[best].wouldHaveLeakedCases / bySet[best].cases;
  const resisted = attacks.filter((r) => r.passed).length;
  const attackRows = ATTACKS.map((a) => {
    const rs = attacks.filter((r) => r.type === a.type);
    return { ...a, total: rs.length, passed: rs.filter((r) => r.passed).length };
  });
  const maxWords = Math.max(...SETS.map((s) => hard[s].avgContextWords));

  const kpis = [
    {
      value: String(retrievalCount + securityCount),
      label: 'Automated test cases',
      detail: (
        <>
          <span className="block">
            <span className="text-slate-300">{retrievalCount} standard RAG evals:</span> does it find the right document?
          </span>
          <span className="block">
            <span className="text-slate-300">{securityCount} red-team evals:</span> can it be tricked?
          </span>
        </>
      ),
      tone: 'text-white',
    },
    {
      value: String(leaks),
      label: 'Documents leaked',
      detail: `No one saw a document above their access level, across ${searches.toLocaleString()} searches`,
      tone: 'text-emerald-400',
    },
    {
      value: `${resisted}/${attacks.length}`,
      label: 'Hacking attempts blocked',
      detail: `Tricks like "ignore your rules" and fake logins · ${controls.filter((c) => c.passed).length}/${controls.length} real users still answered`,
      tone: 'text-emerald-400',
    },
    {
      value: pct(hard[best].answerAt3),
      label: 'Right answer found',
      detail: `On the ${hardCount} hardest questions, within the top 3 results`,
      tone: 'text-blue-400',
    },
    {
      value: `${Math.round(wouldLeak * 100)}%`,
      label: 'Would leak without the filter',
      detail: 'Searches that would expose a restricted document if access weren\'t checked',
      tone: 'text-amber-400',
    },
  ];

  const steps = [
    { icon: UserCheck, title: 'Who is asking?', body: 'Checks who you are and what you may see', term: 'Signed session' },
    { icon: Fingerprint, title: 'Understand the question', body: 'Turns it into a "meaning fingerprint"', term: 'Gemini embeddings' },
    { icon: Search, title: 'Search allowed docs only', body: 'Finds the closest meaning, skips anything off-limits', term: 'pgvector + access filter' },
    { icon: Layers, title: 'Pick the best 5 passages', body: 'Short passages you are cleared to read', term: 'Top-5 chunks' },
    { icon: MessageSquareQuote, title: 'Write the answer', body: 'AI answers only from them, with sources', term: 'Gemini 2.5 Flash' },
  ];

  const builtWith = [
    'RAG: search + AI answers',
    'Vector (meaning-based) search',
    'Database-level access control',
    'Automated test suite',
    'Red teaming',
    'Prompt-injection defense',
  ];
  const stack = ['Next.js', 'Supabase', 'pgvector', 'Gemini', 'Vercel'];

  return (
    <div className="flex flex-col px-4 sm:px-6 py-2.5">
      <div className="max-w-6xl w-full mx-auto flex flex-col gap-2.5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Cpu className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">AskWell</span>
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
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-blue-400">How it works & results</div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
            An AI search assistant that only shows each employee what they're allowed to see
          </h1>
        </div>

        {/* Headline numbers */}
        <div className="flex items-baseline gap-2 -mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Evals</span>
          <span className="text-[11px] text-slate-500">
            {retrievalCount} retrieval + {securityCount} red-team test cases, run against the live system
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5">
              <div className={`text-2xl lg:text-3xl font-bold tracking-tight font-mono ${k.tone}`}>{k.value}</div>
              <div className="text-xs font-semibold text-slate-200 mt-1">{k.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{k.detail}</div>
            </div>
          ))}
        </div>

        {/* How a question is answered */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            How a question gets answered
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {steps.map((step, i) => (
              <div key={step.title} className="relative rounded-lg bg-slate-950/70 border border-slate-800 p-2.5">
                <div className="flex items-center gap-1.5">
                  <step.icon className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-white">
                    {i + 1}. {step.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug mt-1">{step.body}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">{step.term}</p>
                {i < steps.length - 1 && (
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Experiment: best passage size
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Documents are cut into passages. On the {hardCount} hardest questions, small ones found the answer
              most often. Bar = text the AI reads (cost).
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
                      {pct(hard[s].answerAt3)} found · {hard[s].avgContextWords} words
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Hacking attempts blocked
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Each secret document holds unique facts. If one ever appeared in an answer, the test failed.
            </p>
            <div className="space-y-1">
              {attackRows.map((a) => (
                <div key={a.type} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-300">
                    {a.label} <span className="text-slate-600 font-mono text-[10px]">· {a.term}</span>
                  </span>
                  <span className={`font-mono flex-shrink-0 ${a.passed === a.total ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {a.passed}/{a.total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Built with */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Built with</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {builtWith.map((t) => (
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

        {/* More projects */}
        <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white">More projects and the full case study</div>
            <div className="text-[11px] text-indigo-100/80">The write-up, code and other AI product projects live here.</div>
          </div>
          <div className="grid grid-cols-3 gap-2 md:w-[440px]">
            {PROFILE_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <l.icon className="h-3.5 w-3.5" />
                  {l.label}
                </span>
                <ArrowUpRight className="hidden sm:block h-3.5 w-3.5 text-indigo-200" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
