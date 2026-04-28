import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import OpenAI from 'openai';
import Database from 'better-sqlite3';

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

const SYSTEM_PROMPT = `You are a concise running and fitness coach. The user will provide their training log and training plan. Analyze their current progress, compare it to the plan, and provide a brief suggestion (3-5 sentences max). Focus on: current status assessment, what to do next, injury prevention, and how to maximize progress. Reply in the same language as the user's data.`;

export function computeHash(plan: string, records: string): string {
  return crypto.createHash('sha256').update(plan + records).digest('hex');
}

export function buildMessages(plan: string, records: string) {
  return {
    system: SYSTEM_PROMPT,
    user: `Training Plan:\n${plan}\n\nTraining Records:\n${records}`,
  };
}

function getElectronApp() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('electron').app as import('electron').App;
}

export async function getCoachSuggestion(
  db: Database.Database,
  plan: string,
  records: string,
  force: boolean
): Promise<string> {
  const key = loadApiKey();
  if (!key) {
    const userDataPath = path.join(getElectronApp().getPath('userData'), 'api-key.enc');
    return `API key not configured. Open Settings to add your OpenAI key.\n(Key path: ${userDataPath})`;
  }

  const hash = computeHash(plan, records);

  if (!force) {
    const cached = db
      .prepare('SELECT response FROM ai_coach_history WHERE prompt_hash = ? ORDER BY created_at DESC LIMIT 1')
      .get(hash) as { response: string } | undefined;
    if (cached) return cached.response;
  }

  try {
    const client = new OpenAI({ apiKey: key });
    const messages = buildMessages(plan, records);
    const completion = await client.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        { role: 'system', content: messages.system },
        { role: 'user', content: messages.user },
      ],
      max_completion_tokens: 300,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content ?? 'No response from AI.';

    db.prepare(
      'INSERT INTO ai_coach_history (prompt_hash, response, model) VALUES (?, ?, ?)'
    ).run(hash, responseText, 'gpt-5.2');

    return responseText;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return `AI Coach error: ${msg}`;
  }
}
