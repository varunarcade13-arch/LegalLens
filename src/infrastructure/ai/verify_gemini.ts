import { GeminiEmbeddingProvider } from './GeminiEmbeddingProvider';

export interface GenerationVerificationResult {
  providerConfigured: boolean;
  model: string;
  requestSuccessful: boolean;
  responseReceived: boolean;
  extractedText: string;
}

export interface EmbeddingVerificationResult {
  documentEmbeddingLength: number;
  queryEmbeddingLength: number;
  allFinite: boolean;
  cosineSimilarity: number;
  valid: boolean;
}

export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function verifyGeminiGeneration(
  apiKey?: string,
  model?: string
): Promise<GenerationVerificationResult> {
  const key = apiKey || process.env.GEMINI_API_KEY || '';
  const genModel = model || process.env.GEMINI_MODEL || 'gemini-3.6-flash';

  console.log('Gemini provider: configured');
  console.log(`Generation model: ${genModel}`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${genModel}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'What is 2 + 2? Respond only with the number.' }] }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Generation failed with HTTP ${res.status}`);
  }

  const data = (await res.json()) as any;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  console.log('Generation request: successful');
  console.log(`Response received: ${Boolean(text)}`);

  return {
    providerConfigured: true,
    model: genModel,
    requestSuccessful: true,
    responseReceived: Boolean(text),
    extractedText: text,
  };
}

export async function verifyGeminiEmbeddings(
  apiKey?: string,
  model?: string
): Promise<EmbeddingVerificationResult> {
  const provider = new GeminiEmbeddingProvider(apiKey, model);
  const docEmb = await provider.generateEmbedding('Residential lease agreement monthly rent', 'RETRIEVAL_DOCUMENT');
  const queryEmb = await provider.generateEmbedding('How much is the monthly rent?', 'RETRIEVAL_QUERY');

  const docValid = Array.isArray(docEmb) && docEmb.length > 0 && docEmb.every(Number.isFinite);
  const queryValid = Array.isArray(queryEmb) && queryEmb.length > 0 && queryEmb.every(Number.isFinite);

  const similarity = computeCosineSimilarity(docEmb, queryEmb);

  return {
    documentEmbeddingLength: docEmb.length,
    queryEmbeddingLength: queryEmb.length,
    allFinite: docValid && queryValid,
    cosineSimilarity: similarity,
    valid: docValid && queryValid && Number.isFinite(similarity) && similarity > 0,
  };
}
