import { ipcMain } from 'electron';
import Database from 'better-sqlite3';

interface DailyItemRow {
  id: number;
  date: string;
  name: string;
  calories: number;
  is_eaten: number;
  sort_order: number;
  calorie_item_id: number | null;
  created_at: string;
}

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

function rowToDailyItem(r: DailyItemRow) {
  return {
    id: r.id,
    date: r.date,
    name: r.name,
    calories: r.calories,
    isEaten: r.is_eaten === 1,
    sortOrder: r.sort_order,
    calorieItemId: r.calorie_item_id,
    createdAt: r.created_at,
  };
}

export function parseMaxCalories(cal: string): number {
  if (cal.includes('/')) {
    return Math.max(...cal.split('/').map((s) => parseInt(s.trim(), 10)));
  }
  return parseInt(cal, 10);
}

export function suggestItem(
  db: Database.Database,
  date: string
): ReturnType<typeof calorieRowToItem> | null {
  const target = db.prepare('SELECT * FROM daily_targets WHERE date = ?').get(date) as
    | { target_calories: number }
    | undefined;
  if (!target) return null;

  const dailyItems = db
    .prepare('SELECT * FROM daily_items WHERE date = ?')
    .all(date) as DailyItemRow[];

  const eatenItems = dailyItems.filter((i) => i.is_eaten === 1);
  const eatenSum = eatenItems.reduce((sum, i) => sum + i.calories, 0);
  const remaining = target.target_calories - eatenSum;

  if (remaining <= 0) return null;

  const todayNames = new Set(dailyItems.map((i) => i.name));

  const allCalorieItems = db
    .prepare('SELECT * FROM calorie_items ORDER BY category, sort_order')
    .all() as CalorieRow[];

  const candidates = allCalorieItems.filter((item) => {
    const maxCal = parseMaxCalories(item.calories);
    return maxCal <= remaining && !todayNames.has(item.name);
  });

  if (candidates.length === 0) return null;

  const eatenCategories: Record<string, number> = {};
  for (const item of eatenItems) {
    const matchingCalItem = allCalorieItems.find((c) => c.name === item.name);
    if (matchingCalItem) {
      eatenCategories[matchingCalItem.category] =
        (eatenCategories[matchingCalItem.category] || 0) + 1;
    }
  }
  const totalEatenCount = Object.values(eatenCategories).reduce((a, b) => a + b, 0);

  const WEIGHT_DIVERSITY = 0.6;
  const WEIGHT_FIT = 0.4;

  let bestScore = -Infinity;
  let bestCandidate = candidates[0];

  for (const candidate of candidates) {
    const categoryRatio =
      totalEatenCount > 0
        ? (eatenCategories[candidate.category] || 0) / totalEatenCount
        : 0;
    const fitRatio = parseMaxCalories(candidate.calories) / remaining;
    const score = (1 - categoryRatio) * WEIGHT_DIVERSITY + fitRatio * WEIGHT_FIT;
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return calorieRowToItem(bestCandidate);
}

function calorieRowToItem(r: CalorieRow) {
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

export function registerDailyHandlers(db: Database.Database): void {
  ipcMain.handle('daily:getTarget', async (_event, args: { date: string }) => {
    const row = db.prepare('SELECT * FROM daily_targets WHERE date = ?').get(args.date) as
      | { id: number; date: string; target_calories: number }
      | undefined;
    if (!row) return null;
    return { id: row.id, date: row.date, targetCalories: row.target_calories };
  });

  ipcMain.handle(
    'daily:setTarget',
    async (_event, args: { date: string; targetCalories: number }) => {
      db.prepare(
        'INSERT INTO daily_targets (date, target_calories) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET target_calories = excluded.target_calories'
      ).run(args.date, args.targetCalories);
    }
  );

  ipcMain.handle('daily:getItems', async (_event, args: { date: string }) => {
    const rows = db
      .prepare('SELECT * FROM daily_items WHERE date = ? ORDER BY sort_order')
      .all(args.date) as DailyItemRow[];
    return rows.map(rowToDailyItem);
  });

  ipcMain.handle(
    'daily:addItem',
    async (
      _event,
      args: {
        date: string;
        name: string;
        calories: number;
        isEaten: boolean;
        sortOrder: number;
        calorieItemId: number | null;
      }
    ) => {
      const maxOrder = db
        .prepare('SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM daily_items WHERE date = ?')
        .get(args.date) as { maxOrder: number };
      const order = args.sortOrder || maxOrder.maxOrder + 1;

      const result = db
        .prepare(
          'INSERT INTO daily_items (date, name, calories, is_eaten, sort_order, calorie_item_id) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(
          args.date,
          args.name,
          args.calories,
          args.isEaten ? 1 : 0,
          order,
          args.calorieItemId
        );
      const row = db
        .prepare('SELECT * FROM daily_items WHERE id = ?')
        .get(result.lastInsertRowid) as DailyItemRow;
      return rowToDailyItem(row);
    }
  );

  ipcMain.handle('daily:updateItem', async (_event, args: DailyItemRow & { isEaten: boolean }) => {
    db.prepare(
      'UPDATE daily_items SET name = ?, calories = ?, is_eaten = ?, sort_order = ?, calorie_item_id = ? WHERE id = ?'
    ).run(
      args.name,
      args.calories,
      args.isEaten ? 1 : (args.is_eaten !== undefined ? args.is_eaten : 0),
      args.sort_order ?? args.sortOrder,
      args.calorie_item_id ?? args.calorieItemId,
      args.id
    );
  });

  ipcMain.handle('daily:deleteItem', async (_event, args: { id: number }) => {
    db.prepare('DELETE FROM daily_items WHERE id = ?').run(args.id);
  });

  ipcMain.handle('daily:reorder', async (_event, args: { ids: number[] }) => {
    const update = db.prepare('UPDATE daily_items SET sort_order = ? WHERE id = ?');
    const reorderAll = db.transaction(() => {
      args.ids.forEach((id, index) => {
        update.run(index + 1, id);
      });
    });
    reorderAll();
  });

  ipcMain.handle('daily:suggest', async (_event, args: { date: string }) => {
    return suggestItem(db, args.date);
  });
}
