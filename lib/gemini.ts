// Minimal Gemini REST client: embeddings for retrieval, text generation for answers.

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
export const CHAT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const EMBEDDING_DIMS = 768; // must match vector(768) in supabase/schema.sql

export type EmbeddingTask = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

async function callGemini(path: string, body: unknown): Promise<any> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set.');

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    // Back off on rate limits and transient errors.
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`Gemini ${path} failed (${res.status}): ${(await res.text()).slice(0, 500)}`);
  }
}

export async function embedTexts(texts: string[], taskType: EmbeddingTask): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const data = await callGemini(`models/${EMBEDDING_MODEL}:batchEmbedContents`, {
      requests: batch.map((text) => ({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: EMBEDDING_DIMS,
      })),
    });
    vectors.push(...data.embeddings.map((e: { values: number[] }) => e.values));
  }
  return vectors;
}

export async function embedQuery(text: string): Promise<number[]> {
  return (await embedTexts([text], 'RETRIEVAL_QUERY'))[0];
}

export interface GenerateResult {
  text: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export async function generate(params: {
  system: string;
  prompt: string;
  temperature?: number;
  responseSchema?: object; // when set, the model must reply with JSON matching this schema
}): Promise<GenerateResult> {
  const start = Date.now();
  const data = await callGemini(`models/${CHAT_MODEL}:generateContent`, {
    systemInstruction: { parts: [{ text: params.system }] },
    contents: [{ role: 'user', parts: [{ text: params.prompt }] }],
    generationConfig: {
      temperature: params.temperature ?? 0.2,
      ...(params.responseSchema ? { responseMimeType: 'application/json', responseSchema: params.responseSchema } : {}),
      // 2.5 Flash "thinks" by default; a grounded lookup doesn't need it and it adds latency.
      ...(CHAT_MODEL.includes('2.5-flash') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  });
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
  const usage = data.usageMetadata || {};
  return {
    text: text || `(No answer returned; finish reason: ${candidate?.finishReason || 'unknown'})`,
    model: CHAT_MODEL,
    latencyMs: Date.now() - start,
    promptTokens: usage.promptTokenCount || 0,
    completionTokens: usage.candidatesTokenCount || 0,
    totalTokens: usage.totalTokenCount || 0,
  };
}
