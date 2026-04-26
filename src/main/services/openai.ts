import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import OpenAI from 'openai';
import Database from 'better-sqlite3';

let apiKey: string | null = null;

try {
  const keyPath = path.join(__dirname, '../../keys/open-ai-api-key.txt');
  const altKeyPath = path.join(process.cwd(), 'keys/open-ai-api-key.txt');
  const resolvedPath = fs.existsSync(keyPath) ? keyPath : altKeyPath;
  apiKey = fs.readFileSync(resolvedPath, 'utf-8').trim();
  if (!apiKey) apiKey = null;
} catch {
  apiKey = null;
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
  if (!apiKey) return 'API key not configured. Place your OpenAI key in keys/open-ai-api-key.txt.';

  const hash = computeHash(plan, records);

  if (!force) {
    const cached = db
      .prepare('SELECT response FROM ai_coach_history WHERE prompt_hash = ? ORDER BY created_at DESC LIMIT 1')
      .get(hash) as { response: string } | undefined;
    if (cached) return cached.response;
  }

  try {
    const client = new OpenAI({ apiKey });
    const messages = buildMessages(plan, records);
    const completion = await client.chat.completions.create({
      model: 'gpt-5_2-chat-latest',
      messages: [
        { role: 'system', content: messages.system },
        { role: 'user', content: messages.user },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content ?? 'No response from AI.';

    db.prepare(
      'INSERT INTO ai_coach_history (prompt_hash, response, model) VALUES (?, ?, ?)'
    ).run(hash, responseText, 'gpt-5_2-chat-latest');

    return responseText;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return `AI Coach error: ${msg}`;
  }
}
