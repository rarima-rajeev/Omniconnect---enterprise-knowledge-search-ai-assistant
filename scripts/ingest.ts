// Loads the corpus into Supabase: users, documents, and every chunk set with Gemini embeddings.
// Usage: npm run ingest
import { clearanceRank } from '../lib/access';
import { Chunk, CHUNK_SETS, chunkDocument } from '../lib/chunking';
import { loadCorpus } from '../lib/corpus';
import { EMBEDDING_MODEL, embedTexts } from '../lib/gemini';
import { supabaseAdmin } from '../lib/retrieval';
import { allPersonaUsers } from '../lib/session';

async function upsert(table: string, rows: object[]) {
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabaseAdmin().from(table).upsert(rows.slice(i, i + 100));
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  }
}

async function main() {
  const db = supabaseAdmin();
  const docs = loadCorpus();

  await upsert(
    'app_users',
    allPersonaUsers().map((u) => ({
      user_id: u.userId,
      name: u.name,
      role: u.role,
      department: u.department,
      clearance: clearanceRank(u.clearanceLevel),
    })),
  );
  console.log('Users: upserted', allPersonaUsers().length);

  await upsert(
    'documents',
    docs.map((d) => ({
      id: d.id,
      title: d.title,
      domain: d.domain,
      department: d.department,
      classification: d.classification,
      min_clearance: clearanceRank(d.minClearance),
      allowed_roles: d.allowedRoles,
      allowed_departments: d.allowedDepartments,
      owner: d.owner,
      created_at: d.createdAt,
      body: d.body,
    })),
  );
  const { error: staleDocError } = await db
    .from('documents')
    .delete()
    .not('id', 'in', `(${docs.map((d) => `"${d.id}"`).join(',')})`);
  if (staleDocError) throw new Error(staleDocError.message);
  console.log('Documents: upserted', docs.length);

  const chunks: Chunk[] = CHUNK_SETS.flatMap((set) => docs.flatMap((d) => chunkDocument(d, set)));
  console.log(`Embedding ${chunks.length} chunks with ${EMBEDDING_MODEL}...`);
  const vectors = await embedTexts(
    chunks.map((c) => c.content),
    'RETRIEVAL_DOCUMENT',
  );

  // Replace all chunks so stale ones from edited documents disappear.
  const { error: clearError } = await db.from('chunks').delete().neq('id', '');
  if (clearError) throw new Error(clearError.message);
  await upsert(
    'chunks',
    chunks.map((c, i) => ({
      id: c.id,
      document_id: c.documentId,
      chunk_set: c.chunkSet,
      chunk_index: c.chunkIndex,
      content: c.content,
      embedding: JSON.stringify(vectors[i]),
    })),
  );
  for (const set of CHUNK_SETS) console.log(`Chunks (${set}):`, chunks.filter((c) => c.chunkSet === set).length);
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
