// Prints which personas can read which documents, and chunk counts per chunk set.
import { canRead } from '../lib/access';
import { chunkDocument } from '../lib/chunking';
import { loadCorpus } from '../lib/corpus';
import { allPersonaUsers } from '../lib/session';

const docs = loadCorpus();
const users = allPersonaUsers();
console.log(['doc'.padEnd(15), ...users.map((u) => u.name.split(' ')[0].padEnd(6)), 'small', 'medium', 'full'].join(' '));
for (const d of docs) {
  const row = users.map((u) => (canRead(u, d) ? 'yes' : '-').padEnd(6));
  console.log([d.id.padEnd(15), ...row, String(chunkDocument(d, 'small').length).padEnd(5), String(chunkDocument(d, 'medium').length).padEnd(5), chunkDocument(d, 'full').length].join(' '));
}
const totals = (set: 'small' | 'medium' | 'full') => docs.reduce((n, d) => n + chunkDocument(d, set).length, 0);
console.log(`\n${docs.length} documents; ${totals('small')} small chunks; ${totals('medium')} medium chunks; ${totals('full')} full`);
console.log('readable docs per persona:', users.map((u) => `${u.name.split(' ')[0]}=${docs.filter((d) => canRead(u, d)).length}`).join(' '));
