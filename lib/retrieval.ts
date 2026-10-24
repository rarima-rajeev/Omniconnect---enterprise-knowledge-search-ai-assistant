import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ChunkSet } from './chunking';

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  title: string;
  classification: string;
  content: string;
  similarity: number;
}

let client: SupabaseClient | null = null;

// Server-only client. The service role key must never reach the browser.
export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

const rpcArgs = (userId: string, embedding: number[], chunkSet: ChunkSet, k: number) => ({
  p_user_id: userId,
  p_query_embedding: JSON.stringify(embedding),
  p_chunk_set: chunkSet,
  p_match_count: k,
});

// Permission-aware similarity search: the database ranks and filters in one query.
export async function matchChunks(userId: string, embedding: number[], chunkSet: ChunkSet, k: number): Promise<RetrievedChunk[]> {
  const { data, error } = await supabaseAdmin().rpc('match_chunks', rpcArgs(userId, embedding, chunkSet, k));
  if (error) throw new Error(`match_chunks failed: ${error.message}`);
  return (data || []).map((r: any) => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    title: r.title,
    classification: r.classification,
    content: r.content,
    similarity: r.similarity,
  }));
}

// Audit telemetry only (see count_withheld in schema.sql). Never shown to end users.
export async function countWithheld(userId: string, embedding: number[], chunkSet: ChunkSet, k: number): Promise<number> {
  const { data, error } = await supabaseAdmin().rpc('count_withheld', rpcArgs(userId, embedding, chunkSet, k));
  if (error) throw new Error(`count_withheld failed: ${error.message}`);
  return data ?? 0;
}
