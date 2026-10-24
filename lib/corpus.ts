import fs from 'fs';
import path from 'path';
import { AccessTags, Classification } from './access';
import { ClearanceLevel, Department, UserRole } from './types';

export interface CorpusDocument extends AccessTags {
  id: string;
  title: string;
  domain: string;
  department: Department;
  owner: string;
  createdAt: string;
  body: string;
}

export const CORPUS_DIR = path.join(process.cwd(), 'data', 'corpus');

function parseList(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Each corpus file is Markdown with a simple `key: value` frontmatter block.
export function parseDocument(raw: string, fileName = '?'): CorpusDocument {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${fileName}: missing frontmatter`);

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const key of ['id', 'title', 'domain', 'department', 'classification', 'min_clearance', 'owner', 'created_at']) {
    if (!meta[key]) throw new Error(`${fileName}: missing "${key}"`);
  }

  return {
    id: meta.id,
    title: meta.title,
    domain: meta.domain,
    department: meta.department as Department,
    classification: meta.classification as Classification,
    minClearance: meta.min_clearance as ClearanceLevel,
    allowedRoles: parseList(meta.allowed_roles) as UserRole[],
    allowedDepartments: parseList(meta.allowed_departments) as Department[],
    owner: meta.owner,
    createdAt: meta.created_at,
    body: match[2].trim(),
  };
}

export function loadCorpus(dir = CORPUS_DIR): CorpusDocument[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => parseDocument(fs.readFileSync(path.join(dir, f), 'utf8'), f));
}
