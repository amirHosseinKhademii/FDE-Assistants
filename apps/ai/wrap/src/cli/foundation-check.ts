/**
 * foundation-check.ts — Verify hosted LLM setup (chat, embeddings, costs).
 *
 * Tests the Gemini hosted provider with:
 * - Chat completions (temperature 0 vs 1.2 to show effect)
 * - Embeddings batch (cosine similarity by hand)
 * - Cost calculation from usage
 * - Graceful error handling (429/503/404)
 * - --mock mode for testing without network
 *
 * Usage: npx tsx src/cli/foundation-check.ts [--mock]
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import OpenAI from 'openai';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Load .env from repo root (walk up from __dirname to find pnpm-workspace.yaml)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function findWorkspaceRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const up = dirname(dir);
    if (up === dir) return resolve(from, '..', '..', '..');
    dir = up;
  }
}

const REPO_ROOT = findWorkspaceRoot(__dirname);
config({ path: resolve(REPO_ROOT, '.env') });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Environment & Settings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOCK = process.argv.includes('--mock');
const HOSTED_API_KEY = process.env.HOSTED_API_KEY || '';
const HOSTED_MODEL = process.env.HOSTED_MODEL || '';
const HOSTED_BASE_URL = process.env.HOSTED_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10);
const PRICE_IN_PER_1M = process.env.PRICE_IN_PER_1M ? parseFloat(process.env.PRICE_IN_PER_1M) : null;
const PRICE_OUT_PER_1M = process.env.PRICE_OUT_PER_1M ? parseFloat(process.env.PRICE_OUT_PER_1M) : null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Math: L2 norm and cosine similarity (no library)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function l2Norm(vec: number[]): number {
  return Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, av, i) => sum + av * b[i], 0);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const normA = l2Norm(a);
  const normB = l2Norm(b);
  if (normA === 0 || normB === 0) return 0;
  return dotProduct(a, b) / (normA * normB);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mock Mode: Deterministic vectors and counts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000;
  return x - Math.floor(x);
}

function generateMockVector(id: number, seed: number = 42): number[] {
  const vec: number[] = [];
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    // Make vectors 1 and 2 closer (steering-related) than 1 and 3 (weather)
    const base = seededRandom(seed + id, i);
    if (id === 1) {
      vec.push(base * 0.5 + 0.3); // Base vector
    } else if (id === 2) {
      vec.push(base * 0.5 + 0.31); // Very similar (steering domain overlap)
    } else {
      vec.push(base * 0.5 + 0.1); // Different (weather topic)
    }
  }
  return vec;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main(): Promise<void> {
  if (MOCK) {
    console.log('MOCK MODE — no API call made\n');
  }

  // ──── Validation ────────────────────────────────────────────────────────
  if (!MOCK && (!HOSTED_API_KEY || !HOSTED_MODEL)) {
    console.error('Error: HOSTED_API_KEY and HOSTED_MODEL must be set in .env (or use --mock)');
    process.exit(1);
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // ──── Chat: Temperature 0 ────────────────────────────────────────────────
  if (!MOCK) {
    const client = new OpenAI({
      apiKey: HOSTED_API_KEY,
      baseURL: HOSTED_BASE_URL,
    });

    try {
      const response0 = await client.chat.completions.create({
        model: HOSTED_MODEL,
        messages: [{ role: 'user', content: 'Explain what an electric power steering module does in one sentence.' }],
        temperature: 0,
      });

      const answer0 = response0.choices[0]?.message?.content || '';
      const usage0 = response0.usage;
      totalInputTokens += usage0?.prompt_tokens || 0;
      totalOutputTokens += usage0?.completion_tokens || 0;

      console.log('─── CHAT (Temperature 0) ──────────────────────────────────────');
      console.log(`Answer: ${answer0}`);
      console.log(`Tokens: ${usage0?.prompt_tokens || 0} in, ${usage0?.completion_tokens || 0} out\n`);

      // ──── Chat: Temperature 1.2 ────────────────────────────────────────────
      const response1p2 = await client.chat.completions.create({
        model: HOSTED_MODEL,
        messages: [{ role: 'user', content: 'Explain what an electric power steering module does in one sentence.' }],
        temperature: 1.2,
      });

      const answer1p2 = response1p2.choices[0]?.message?.content || '';
      const usage1p2 = response1p2.usage;
      totalInputTokens += usage1p2?.prompt_tokens || 0;
      totalOutputTokens += usage1p2?.completion_tokens || 0;

      console.log('─── CHAT (Temperature 1.2) ────────────────────────────────────');
      console.log(`Answer: ${answer1p2}`);
      console.log(`Tokens: ${usage1p2?.prompt_tokens || 0} in, ${usage1p2?.completion_tokens || 0} out\n`);

      // ──── Embeddings ────────────────────────────────────────────────────────
      console.log('─── EMBEDDINGS ─────────────────────────────────────────────────');

      const testTexts = [
        'Electric power steering control module',
        'The module controls steering torque electronically',
        'Weather forecast for tomorrow',
      ];

      const embResponse = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: testTexts,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      const vectors = embResponse.data.map((d) => d.embedding);
      console.log(`Vectors: ${vectors.length} (batch request)`);
      console.log(`Dimensions: ${vectors[0].length}`);

      if (vectors[0].length !== EMBEDDING_DIMENSIONS) {
        console.log(`FAIL: expected ${EMBEDDING_DIMENSIONS} dims, got ${vectors[0].length}`);
        process.exit(1);
      }

      console.log(
        `First 5 numbers of vector 1: [${vectors[0]
          .slice(0, 5)
          .map((n) => n.toFixed(6))
          .join(', ')}]`,
      );

      // L2 norms (note: Gemini may not be unit length at reduced dimensions)
      const norms = vectors.map((v) => l2Norm(v));
      console.log(
        `L2 norms: [${norms.map((n) => n.toFixed(6)).join(', ')}] (may not be 1.0 at reduced dims)\n`,
      );

      // Cosine similarity
      const sim1_2 = cosineSimilarity(vectors[0], vectors[1]);
      const sim1_3 = cosineSimilarity(vectors[0], vectors[2]);

      console.log('─── SIMILARITY ─────────────────────────────────────────────────');
      console.log(`Steering(1) ↔ Steering(2): ${sim1_2.toFixed(6)}`);
      console.log(`Steering(1) ↔ Weather(3):  ${sim1_3.toFixed(6)}`);

      if (sim1_2 > sim1_3) {
        console.log('PASS: steering texts are closer than weather\n');
      } else {
        console.log(`FAIL: expected steering texts closer than weather\n`);
        process.exit(1);
      }

      // ──── Cost ──────────────────────────────────────────────────────────────
      console.log('─── COST ───────────────────────────────────────────────────────');
      if (PRICE_IN_PER_1M !== null && PRICE_OUT_PER_1M !== null) {
        const costIn = (totalInputTokens / 1_000_000) * PRICE_IN_PER_1M;
        const costOut = (totalOutputTokens / 1_000_000) * PRICE_OUT_PER_1M;
        const total = costIn + costOut;
        console.log(`cost: $${total.toFixed(4)} (${totalInputTokens} in, ${totalOutputTokens} out)`);
      } else {
        console.log('cost: $0.00 (free tier)');
      }
    } catch (err: any) {
      const status = err.status;
      if (status === 429) {
        console.error('Rate limit exceeded — try again in a moment');
        process.exit(1);
      } else if (status === 503) {
        console.error('Service temporarily unavailable — high demand');
        process.exit(1);
      } else if (status === 404) {
        console.error(`Model not found — try another HOSTED_MODEL`);
        process.exit(1);
      }
      throw err;
    }
  } else {
    // ──── Mock Mode ──────────────────────────────────────────────────────────
    const mockAnswer0 = 'An electric power steering module reduces steering effort by using an electric motor to assist the driver.';
    const mockAnswer1p2 = 'Electric power steering systems employ computerized torque assistance mechanisms to enhance directional control responsiveness.';

    console.log('─── CHAT (Temperature 0) ──────────────────────────────────────');
    console.log(`Answer: ${mockAnswer0}`);
    console.log(`Tokens: 15 in, 28 out\n`);

    console.log('─── CHAT (Temperature 1.2) ────────────────────────────────────');
    console.log(`Answer: ${mockAnswer1p2}`);
    console.log(`Tokens: 15 in, 36 out\n`);

    console.log('─── EMBEDDINGS ─────────────────────────────────────────────────');
    const vectors = [generateMockVector(1), generateMockVector(2), generateMockVector(3)];

    console.log(`Vectors: 3 (batch request)`);
    console.log(`Dimensions: ${EMBEDDING_DIMENSIONS}`);
    console.log(
      `First 5 numbers of vector 1: [${vectors[0]
        .slice(0, 5)
        .map((n) => n.toFixed(6))
        .join(', ')}]`,
    );

    const norms = vectors.map((v) => l2Norm(v));
    console.log(
      `L2 norms: [${norms.map((n) => n.toFixed(6)).join(', ')}] (may not be 1.0 at reduced dims)\n`,
    );

    console.log('─── SIMILARITY ─────────────────────────────────────────────────');
    const sim1_2 = cosineSimilarity(vectors[0], vectors[1]);
    const sim1_3 = cosineSimilarity(vectors[0], vectors[2]);

    console.log(`Steering(1) ↔ Steering(2): ${sim1_2.toFixed(6)}`);
    console.log(`Steering(1) ↔ Weather(3):  ${sim1_3.toFixed(6)}`);
    console.log('PASS: steering texts are closer than weather\n');

    console.log('─── COST ───────────────────────────────────────────────────────');
    console.log('cost: $0.00 (free tier)');
  }
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
