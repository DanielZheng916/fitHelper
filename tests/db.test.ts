import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/main/db/migrations';
import { seedData } from '../src/main/db/seed';

describe('Database migrations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  it('should create all 7 tables', () => {
    runMigrations(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name).sort();
    expect(tableNames).toEqual([
      'ai_coach_history',
      'calorie_items',
      'conversion_history',
      'daily_items',
      'daily_targets',
      'training_plan',
      'training_records',
    ]);
  });

  it('should be idempotent (running twice does not error)', () => {
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });
});

describe('Database seed', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
  });

  it('should insert 24 preset calorie items', () => {
    seedData(db);
    const count = db.prepare('SELECT COUNT(*) as count FROM calorie_items').get() as {
      count: number;
    };
    expect(count.count).toBe(24);
  });

  it('should insert 14 主食, 6 小食, and 4 酒 items', () => {
    seedData(db);
    const categories = db
      .prepare('SELECT category, COUNT(*) as count FROM calorie_items GROUP BY category')
      .all() as { category: string; count: number }[];

    const map = Object.fromEntries(categories.map((c) => [c.category, c.count]));
    expect(map['主食']).toBe(14);
    expect(map['小食']).toBe(6);
    expect(map['酒']).toBe(4);
  });

  it('should be idempotent (running twice does not duplicate items)', () => {
    seedData(db);
    seedData(db);
    const count = db.prepare('SELECT COUNT(*) as count FROM calorie_items').get() as {
      count: number;
    };
    expect(count.count).toBe(24);
  });

  it('should initialize training_records and training_plan with empty content', () => {
    seedData(db);
    const records = db.prepare('SELECT content FROM training_records').get() as { content: string };
    const plan = db.prepare('SELECT content FROM training_plan').get() as { content: string };
    expect(records.content).toBe('');
    expect(plan.content).toBe('');
  });

  it('should not duplicate training_records on re-run', () => {
    seedData(db);
    seedData(db);
    const count = db.prepare('SELECT COUNT(*) as count FROM training_records').get() as {
      count: number;
    };
    expect(count.count).toBe(1);
  });
});
