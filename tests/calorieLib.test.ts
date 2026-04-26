import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/main/db/migrations';
import { seedData } from '../src/main/db/seed';

interface CalorieRow {
  id: number;
  name: string;
  calories: string;
  category: string;
  sort_order: number;
  is_preset: number;
}

describe('Calorie Library CRUD', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
    seedData(db);
  });

  it('should retrieve all preset items', () => {
    const rows = db.prepare('SELECT * FROM calorie_items ORDER BY category, sort_order').all() as CalorieRow[];
    expect(rows.length).toBe(24);
  });

  it('should create a new calorie item', () => {
    db.prepare(
      'INSERT INTO calorie_items (name, calories, category, sort_order, is_preset) VALUES (?, ?, ?, ?, ?)'
    ).run('Test Item', '200', '小食', 10, 0);
    const row = db.prepare("SELECT * FROM calorie_items WHERE name = 'Test Item'").get() as CalorieRow;
    expect(row).toBeDefined();
    expect(row.calories).toBe('200');
    expect(row.category).toBe('小食');
    expect(row.is_preset).toBe(0);
  });

  it('should update a calorie item', () => {
    const original = db.prepare("SELECT * FROM calorie_items WHERE name = '拿铁'").get() as CalorieRow;
    db.prepare('UPDATE calorie_items SET calories = ? WHERE id = ?').run('120', original.id);
    const updated = db.prepare('SELECT * FROM calorie_items WHERE id = ?').get(original.id) as CalorieRow;
    expect(updated.calories).toBe('120');
  });

  it('should delete a calorie item', () => {
    const original = db.prepare("SELECT * FROM calorie_items WHERE name = '拿铁'").get() as CalorieRow;
    db.prepare('DELETE FROM calorie_items WHERE id = ?').run(original.id);
    const deleted = db.prepare('SELECT * FROM calorie_items WHERE id = ?').get(original.id);
    expect(deleted).toBeUndefined();
  });
});
