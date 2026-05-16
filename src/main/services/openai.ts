import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import OpenAI from 'openai';
import Database from 'better-sqlite3';
import { CoachSuggestion } from '../../shared/types';

let apiKey: string | null | undefined;

export function clearApiKeyCache(): void {
  apiKey = undefined;
}

function tryReadEncryptedKey(): string | null {
  try {
    // Lazy require to avoid circular dependency at import time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readEncryptedKey } = require('../ipc/settings') as typeof import('../ipc/settings');
    return readEncryptedKey();
  } catch {
    return null;
  }
}

function tryReadDevKey(): string | null {
  const devPath = path.join(process.cwd(), 'keys', 'open-ai-api-key.txt');
  try {
    const key = fs.readFileSync(devPath, 'utf-8').trim();
    return key || null;
  } catch {
    return null;
  }
}

export function loadApiKey(): string | null {
  if (apiKey !== undefined) return apiKey;

  apiKey = tryReadEncryptedKey() ?? tryReadDevKey() ?? null;
  return apiKey;
}

const SYSTEM_PROMPT = `You are a concise running and fitness coach. The user will provide their training goal, training plan, and training log. Analyze their current progress against the plan and goal.

You MUST reply with valid JSON only, no markdown, no extra text. Use this exact schema:

{
  "next_training_day": {
    "plan": "<specific workout suggestion for the next training day>",
    "reason": "<2-sentence explanation>"
  },
  "next_training_week": {
    "plan": "<training plan suggestion for the coming week>",
    "reason": "<2-sentence explanation>"
  }
}

Reply in the same language as the user's data.`;

export function computeHash(goal: string, plan: string, records: string): string {
  return crypto.createHash('sha256').update(goal + plan + records).digest('hex');
}

export function buildMessages(goal: string, plan: string, records: string) {
  return {
    system: SYSTEM_PROMPT,
    user: `Training Goal:\n${goal}\n\nTraining Plan:\n${plan}\n\nTraining Records:\n${records}`,
  };
}

export async function getCoachSuggestion(
  db: Database.Database,
  goal: string,
  plan: string,
  records: string,
  force: boolean
): Promise<CoachSuggestion | string> {
  const key = loadApiKey();
  if (!key) {
    return 'API key not configured. Open Settings to add your OpenAI key.';
  }

  const hash = computeHash(goal, plan, records);

  if (!force) {
    const cached = db
      .prepare('SELECT response FROM ai_coach_history WHERE prompt_hash = ? ORDER BY created_at DESC LIMIT 1')
      .get(hash) as { response: string } | undefined;
    if (cached) {
      try {
        return JSON.parse(cached.response) as CoachSuggestion;
      } catch {
        return cached.response;
      }
    }
  }

  try {
    const client = new OpenAI({ apiKey: key });
    const messages = buildMessages(goal, plan, records);
    const completion = await client.chat.completions.create({
      model: 'gpt-5.4',
      messages: [
        { role: 'system', content: messages.system },
        { role: 'user', content: messages.user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const rawText = completion.choices[0]?.message?.content ?? '{}';

    db.prepare(
      'INSERT INTO ai_coach_history (prompt_hash, response, model) VALUES (?, ?, ?)'
    ).run(hash, rawText, 'gpt-5.4');

    try {
      return JSON.parse(rawText) as CoachSuggestion;
    } catch {
      return rawText;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return `AI Coach error: ${msg}`;
  }
}
