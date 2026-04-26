import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/main/db/migrations';
import { seedData } from '../src/main/db/seed';
import { suggestItem, parseMaxCalories } from '../src/main/ipc/dailyTracker';

describe('parseMaxCalories', () => {
  it('should parse single value', () => {
    expect(parseMaxCalories('100')).toBe(100);
  });
  it('should return max of range', () => {
    expect(parseMaxCalories('380/440')).toBe(440);
  });
});

describe('Food suggestion algorithm', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
    seedData(db);
  });

  it('should return null when no target is set', () => {
    const result = suggestItem(db, '2026-04-26');
    expect(result).toBeNull();
  });

  it('should return null when remaining budget is 0', () => {
    db.prepare('INSERT INTO daily_targets (date, target_calories) VALUES (?, ?)').run('2026-04-26', 100);
    db.prepare('INSERT INTO daily_items (date, name, calories, is_eaten, sort_order) VALUES (?, ?, ?, ?, ?)').run(
      '2026-04-26', '食物', 200, 1, 1
    );
    const result = suggestItem(db, '2026-04-26');
    expect(result).toBeNull();
  });

  it('should return null when all library items exceed budget', () => {
    db.prepare('INSERT INTO daily_targets (date, target_calories) VALUES (?, ?)').run('2026-04-26', 10);
    const result = suggestItem(db, '2026-04-26');
    expect(result).toBeNull();
  });

  it('should return an item that fits the budget', () => {
    db.prepare('INSERT INTO daily_targets (date, target_calories) VALUES (?, ?)').run('2026-04-26', 1800);
    const result = suggestItem(db, '2026-04-26');
    expect(result).not.toBeNull();
    expect(parseMaxCalories(result!.calories)).toBeLessThanOrEqual(1800);
  });

  it('should not suggest items already on today list', () => {
    db.prepare('INSERT INTO daily_targets (date, target_calories) VALUES (?, ?)').run('2026-04-26', 1800);
    const allItems = db.prepare('SELECT name FROM calorie_items').all() as { name: string }[];
    for (const item of allItems) {
      db.prepare(
        'INSERT INTO daily_items (date, name, calories, is_eaten, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).run('2026-04-26', item.name, 50, 0, 1);
    }
    const result = suggestItem(db, '2026-04-26');
    expect(result).toBeNull();
  });

  it('should favor under-represented categories', () => {
    db.prepare('INSERT INTO daily_targets (date, target_calories) VALUES (?, ?)').run('2026-04-26', 2000);
    const stapleNames = ['鸡蛋*1', '鸡蛋*5', '咖喱块*1餐', '鸡肉*1磅', '洋葱'];
    stapleNames.forEach((name, i) => {
      db.prepare(
        'INSERT INTO daily_items (date, name, calories, is_eaten, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).run('2026-04-26', name, 100, 1, i + 1);
    });
    const result = suggestItem(db, '2026-04-26');
    expect(result).not.toBeNull();
    if (result) {
      expect(['小食', '酒']).toContain(result.category);
    }
  });
});
