import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/main/db/migrations';
import { buildMessages, computeHash } from '../src/main/services/openai';

describe('OpenAI prompt assembly', () => {
  it('should build correct system and user messages', () => {
    const plan = 'Phase 1: A: 5.2 mph × 35 min';
    const records = 'Week 83\n4.6\n平板卷腹*5';
    const messages = buildMessages(plan, records);

    expect(messages.system).toContain('concise running and fitness coach');
    expect(messages.user).toContain('Training Plan:');
    expect(messages.user).toContain(plan);
    expect(messages.user).toContain('Training Records:');
    expect(messages.user).toContain(records);
  });

  it('should include key coaching instructions in system prompt', () => {
    const { system } = buildMessages('', '');
    expect(system).toContain('current status assessment');
    expect(system).toContain('injury prevention');
    expect(system).toContain('3-5 sentences max');
  });
});

describe('Hash-based caching', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
  });

  it('should store and retrieve cached response by hash', () => {
    const hash = computeHash('plan', 'records');
    db.prepare('INSERT INTO ai_coach_history (prompt_hash, response, model) VALUES (?, ?, ?)').run(
      hash,
      'cached suggestion',
      'gpt-5.2'
    );

    const cached = db
      .prepare('SELECT response FROM ai_coach_history WHERE prompt_hash = ? ORDER BY created_at DESC LIMIT 1')
      .get(hash) as { response: string } | undefined;
    expect(cached).toBeDefined();
    expect(cached!.response).toBe('cached suggestion');
  });

  it('should return undefined for unknown hash', () => {
    const cached = db
      .prepare('SELECT response FROM ai_coach_history WHERE prompt_hash = ? ORDER BY created_at DESC LIMIT 1')
      .get('nonexistent_hash') as { response: string } | undefined;
    expect(cached).toBeUndefined();
  });

  it('should allow multiple entries with different hashes', () => {
    const h1 = computeHash('plan1', 'records1');
    const h2 = computeHash('plan2', 'records2');
    db.prepare('INSERT INTO ai_coach_history (prompt_hash, response, model) VALUES (?, ?, ?)').run(
      h1, 'response 1', 'gpt-5.2'
    );
    db.prepare('INSERT INTO ai_coach_history (prompt_hash, response, model) VALUES (?, ?, ?)').run(
      h2, 'response 2', 'gpt-5.2'
    );

    const count = (db.prepare('SELECT COUNT(*) as count FROM ai_coach_history').get() as { count: number }).count;
    expect(count).toBe(2);
  });
});
