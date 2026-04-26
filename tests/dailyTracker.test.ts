import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/main/db/migrations';

describe('Daily Tracker', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
  });

  it('should set and get a daily target', () => {
    db.prepare('INSERT INTO daily_targets (date, target_calories) VALUES (?, ?)').run(
      '2026-04-26',
      1800
    );
    const row = db.prepare('SELECT * FROM daily_targets WHERE date = ?').get('2026-04-26') as {
      target_calories: number;
    };
    expect(row.target_calories).toBe(1800);
  });

  it('should add items and calculate eaten sum', () => {
    db.prepare(
      'INSERT INTO daily_items (date, name, calories, is_eaten, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run('2026-04-26', '咖啡', 120, 1, 1);
    db.prepare(
      'INSERT INTO daily_items (date, name, calories, is_eaten, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run('2026-04-26', '咖喱小餐', 630, 1, 2);
    db.prepare(
      'INSERT INTO daily_items (date, name, calories, is_eaten, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run('2026-04-26', '威士忌', 100, 0, 3);

    const eatenItems = db
      .prepare('SELECT * FROM daily_items WHERE date = ? AND is_eaten = 1')
      .all('2026-04-26') as { calories: number }[];
    const eatenSum = eatenItems.reduce((sum, i) => sum + i.calories, 0);
    expect(eatenSum).toBe(750);
  });

  it('should toggle item eaten status', () => {
    const result = db
      .prepare(
        'INSERT INTO daily_items (date, name, calories, is_eaten, sort_order) VALUES (?, ?, ?, ?, ?)'
      )
      .run('2026-04-26', '拿铁', 100, 0, 1);
    db.prepare('UPDATE daily_items SET is_eaten = 1 WHERE id = ?').run(result.lastInsertRowid);
    const row = db.prepare('SELECT * FROM daily_items WHERE id = ?').get(result.lastInsertRowid) as {
      is_eaten: number;
    };
    expect(row.is_eaten).toBe(1);
  });

  it('should reorder items by updating sort_order', () => {
    const r1 = db
      .prepare('INSERT INTO daily_items (date, name, calories, is_eaten, sort_order) VALUES (?, ?, ?, ?, ?)')
      .run('2026-04-26', 'A', 100, 1, 1);
    const r2 = db
      .prepare('INSERT INTO daily_items (date, name, calories, is_eaten, sort_order) VALUES (?, ?, ?, ?, ?)')
      .run('2026-04-26', 'B', 200, 1, 2);

    const id1 = Number(r1.lastInsertRowid);
    const id2 = Number(r2.lastInsertRowid);

    const update = db.prepare('UPDATE daily_items SET sort_order = ? WHERE id = ?');
    update.run(1, id2);
    update.run(2, id1);

    const rows = db
      .prepare('SELECT * FROM daily_items WHERE date = ? ORDER BY sort_order')
      .all('2026-04-26') as { name: string }[];
    expect(rows[0].name).toBe('B');
    expect(rows[1].name).toBe('A');
  });
});
