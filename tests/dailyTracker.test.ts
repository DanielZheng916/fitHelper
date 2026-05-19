import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/main/db/migrations';
import { getOrCreateTarget, DEFAULT_TARGET_KCAL } from '../src/main/ipc/dailyTracker';

function getToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

describe('getToday', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return local date, not UTC', () => {
    // 2026-04-26 22:00 EDT = 2026-04-27 02:00 UTC
    // Local date should be April 26, not April 27
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 26, 22, 0, 0));
    expect(getToday()).toBe('2026-04-26');
  });

  it('should zero-pad month and day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0));
    expect(getToday()).toBe('2026-01-05');
  });
});

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

  it('should upsert target for the same date', () => {
    db.prepare(
      'INSERT INTO daily_targets (date, target_calories) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET target_calories = excluded.target_calories'
    ).run('2026-04-26', 1800);
    db.prepare(
      'INSERT INTO daily_targets (date, target_calories) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET target_calories = excluded.target_calories'
    ).run('2026-04-26', 2000);

    const row = db.prepare('SELECT * FROM daily_targets WHERE date = ?').get('2026-04-26') as {
      target_calories: number;
    };
    expect(row.target_calories).toBe(2000);

    const count = db.prepare('SELECT COUNT(*) as cnt FROM daily_targets WHERE date = ?').get('2026-04-26') as { cnt: number };
    expect(count.cnt).toBe(1);
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

  it('should calculate planned (not-eaten) sum separately from eaten sum', () => {
    db.prepare(
      'INSERT INTO daily_items (date, name, calories, is_eaten, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run('2026-04-26', '咖啡', 120, 1, 1);
    db.prepare(
      'INSERT INTO daily_items (date, name, calories, is_eaten, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run('2026-04-26', '咖喱小餐', 630, 0, 2);
    db.prepare(
      'INSERT INTO daily_items (date, name, calories, is_eaten, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run('2026-04-26', '威士忌', 100, 0, 3);

    const allItems = db
      .prepare('SELECT * FROM daily_items WHERE date = ?')
      .all('2026-04-26') as { calories: number; is_eaten: number }[];
    const eatenSum = allItems.filter((i) => i.is_eaten === 1).reduce((s, i) => s + i.calories, 0);
    const plannedSum = allItems.filter((i) => i.is_eaten === 0).reduce((s, i) => s + i.calories, 0);

    expect(eatenSum).toBe(120);
    expect(plannedSum).toBe(730);
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

describe('getOrCreateTarget — target inheritance', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
  });

  it('should return DEFAULT_TARGET_KCAL when no history exists', () => {
    const result = getOrCreateTarget(db, '2026-05-19');
    expect(result.targetCalories).toBe(DEFAULT_TARGET_KCAL);
    expect(result.date).toBe('2026-05-19');
  });

  it('should persist the auto-created target so subsequent calls return the same row', () => {
    const first = getOrCreateTarget(db, '2026-05-19');
    const second = getOrCreateTarget(db, '2026-05-19');
    expect(first.id).toBe(second.id);
    expect(first.targetCalories).toBe(second.targetCalories);
  });

  it('should inherit the most recent previous day target', () => {
    db.prepare('INSERT INTO daily_targets (date, target_calories) VALUES (?, ?)').run('2026-05-17', 2200);
    db.prepare('INSERT INTO daily_targets (date, target_calories) VALUES (?, ?)').run('2026-05-18', 2500);

    const result = getOrCreateTarget(db, '2026-05-19');
    expect(result.targetCalories).toBe(2500);
  });

  it('should not inherit from a future date', () => {
    db.prepare('INSERT INTO daily_targets (date, target_calories) VALUES (?, ?)').run('2026-05-20', 3000);

    const result = getOrCreateTarget(db, '2026-05-19');
    expect(result.targetCalories).toBe(DEFAULT_TARGET_KCAL);
  });

  it('should return existing target without overwriting it', () => {
    db.prepare('INSERT INTO daily_targets (date, target_calories) VALUES (?, ?)').run('2026-05-19', 2100);

    const result = getOrCreateTarget(db, '2026-05-19');
    expect(result.targetCalories).toBe(2100);
  });

  it('should inherit across non-consecutive days', () => {
    db.prepare('INSERT INTO daily_targets (date, target_calories) VALUES (?, ?)').run('2026-05-10', 1600);

    const result = getOrCreateTarget(db, '2026-05-19');
    expect(result.targetCalories).toBe(1600);
  });
});
