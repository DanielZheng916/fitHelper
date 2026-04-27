import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import OpenAI from 'openai';
import Database from 'better-sqlite3';

const KEY_FILENAME = 'open-ai-api-key.txt';

let apiKey: string | null | undefined;

function getElectronApp() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('electron').app as import('electron').App;
}

function loadApiKey(): string | null {
  if (apiKey !== undefined) return apiKey;

  const electronApp = getElectronApp();
  const candidates = [
    path.join(electronApp.getPath('userData'), KEY_FILENAME),
    path.join(electronApp.getAppPath(), 'keys', KEY_FILENAME),
    path.join(process.cwd(), 'keys', KEY_FILENAME),
  ];

  for (const p of candidates) {
    try {
      const key = fs.readFileSync(p, 'utf-8').trim();
      if (key) {
        apiKey = key;
        return apiKey;
      }
    } catch {
      // try next candidate
    }
  }

  apiKey = null;
  return null;
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

export async function getCoachSuggestion(
  db: Database.Database,
  plan: string,
  records: string,
  force: boolean
): Promise<string> {
  const key = loadApiKey();
  if (!key) {
    const userDataPath = path.join(getElectronApp().getPath('userData'), KEY_FILENAME);
    return `API key not configured. Place your OpenAI key in:\n${userDataPath}`;
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
