import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/main/db/migrations';
import { seedData } from '../src/main/db/seed';
import { computeHash } from '../src/main/services/openai';

describe('Training records and plan', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
    seedData(db);
  });

  it('should save and retrieve training records', () => {
    const content = 'Week 85\n4.20\n平板卷腹*4';
    db.prepare('UPDATE training_records SET content = ?, updated_at = CURRENT_TIMESTAMP').run(content);
    const row = db.prepare('SELECT content FROM training_records LIMIT 1').get() as { content: string };
    expect(row.content).toBe(content);
  });

  it('should save and retrieve training plan', () => {
    const content = '第1阶段 A: 5.2 mph × 35 min';
    db.prepare('UPDATE training_plan SET content = ?, updated_at = CURRENT_TIMESTAMP').run(content);
    const row = db.prepare('SELECT content FROM training_plan LIMIT 1').get() as { content: string };
    expect(row.content).toBe(content);
  });

  it('should start with empty content after seed', () => {
    const records = db.prepare('SELECT content FROM training_records LIMIT 1').get() as { content: string };
    const plan = db.prepare('SELECT content FROM training_plan LIMIT 1').get() as { content: string };
    expect(records.content).toBe('');
    expect(plan.content).toBe('');
  });
});

describe('Hash computation', () => {
  it('should produce same hash for same input', () => {
    const h1 = computeHash('plan A', 'records A');
    const h2 = computeHash('plan A', 'records A');
    expect(h1).toBe(h2);
  });

  it('should produce different hash for different input', () => {
    const h1 = computeHash('plan A', 'records A');
    const h2 = computeHash('plan B', 'records A');
    expect(h1).not.toBe(h2);
  });

  it('should return a hex string', () => {
    const h = computeHash('test', 'test');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
