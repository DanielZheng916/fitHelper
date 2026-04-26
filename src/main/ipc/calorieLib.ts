import { ipcMain } from 'electron';
import Database from 'better-sqlite3';

interface CalorieRow {
  id: number;
  name: string;
  calories: string;
  category: string;
  sort_order: number;
  is_preset: number;
  created_at: string;
  updated_at: string;
}

function rowToItem(r: CalorieRow) {
  return {
    id: r.id,
    name: r.name,
    calories: r.calories,
    category: r.category,
    sortOrder: r.sort_order,
    isPreset: r.is_preset === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function registerCalorieHandlers(db: Database.Database): void {
  ipcMain.handle('calorie:getAll', async () => {
    const rows = db
      .prepare('SELECT * FROM calorie_items ORDER BY category, sort_order')
      .all() as CalorieRow[];
    return rows.map(rowToItem);
  });

  ipcMain.handle(
    'calorie:create',
    async (
      _event,
      args: { name: string; calories: string; category: string; sortOrder: number; isPreset: boolean }
    ) => {
      const result = db
        .prepare(
          'INSERT INTO calorie_items (name, calories, category, sort_order, is_preset) VALUES (?, ?, ?, ?, ?)'
        )
        .run(args.name, args.calories, args.category, args.sortOrder, args.isPreset ? 1 : 0);
      const row = db
        .prepare('SELECT * FROM calorie_items WHERE id = ?')
        .get(result.lastInsertRowid) as CalorieRow;
      return rowToItem(row);
    }
  );

  ipcMain.handle(
    'calorie:update',
    async (
      _event,
      args: { id: number; name: string; calories: string; category: string; sortOrder: number; isPreset: boolean }
    ) => {
      db.prepare(
        'UPDATE calorie_items SET name = ?, calories = ?, category = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(args.name, args.calories, args.category, args.sortOrder, args.id);
      const row = db.prepare('SELECT * FROM calorie_items WHERE id = ?').get(args.id) as CalorieRow;
      return rowToItem(row);
    }
  );

  ipcMain.handle('calorie:delete', async (_event, args: { id: number }) => {
    db.prepare('DELETE FROM calorie_items WHERE id = ?').run(args.id);
  });
}
