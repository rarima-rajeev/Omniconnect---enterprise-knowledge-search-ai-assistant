'use client';

import ReactMarkdown, { Components } from 'react-markdown';

// Renders the model's Markdown answer. react-markdown never renders raw HTML, which
// matters here: answers quote retrieved documents, and a poisoned document could
// contain HTML or script tags.
const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="marker:text-slate-500">{children}</li>,
  h1: ({ children }) => <h3 className="text-sm font-bold text-white mb-2">{children}</h3>,
  h2: ({ children }) => <h3 className="text-sm font-bold text-white mb-2">{children}</h3>,
  h3: ({ children }) => <h3 className="text-sm font-bold text-white mb-2">{children}</h3>,
  code: ({ children }) => (
    <code className="font-mono text-[0.85em] px-1 py-0.5 rounded bg-slate-800 text-blue-300">{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-slate-600 pl-3 text-slate-400 italic mb-2 last:mb-0">{children}</blockquote>
  ),
  // Links are shown as plain text, never clickable: a poisoned source could ask the
  // model to include a phishing link.
  a: ({ children }) => <span className="underline decoration-dotted">{children}</span>,
};

export function MarkdownAnswer({ text }: { text: string }) {
  return <ReactMarkdown components={components}>{text}</ReactMarkdown>;
}
