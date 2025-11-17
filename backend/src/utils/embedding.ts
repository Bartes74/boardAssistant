import crypto from "node:crypto";

const VECTOR_DIMENSION = 768;

export function fallbackEmbeddingFromText(text: string): number[] {
  const hash = crypto.createHash("sha256").update(text).digest();
  const vector: number[] = [];
  for (let i = 0; i < VECTOR_DIMENSION; i += 1) {
    const byte = hash[i % hash.length];
    const normalized = (byte / 255) * 2 - 1; // [-1, 1]
    vector.push(Number(normalized.toFixed(6)));
  }
  return vector;
}
