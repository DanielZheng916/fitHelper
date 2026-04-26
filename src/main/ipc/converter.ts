import { ipcMain } from 'electron';
import Database from 'better-sqlite3';

export function mphToMinKm(mph: number): string | null {
  if (mph <= 0 || !isFinite(mph)) return null;
  const kmPerHour = mph * 1.60934;
  const minPerKm = 60 / kmPerHour;
  const minutes = Math.floor(minPerKm);
  const seconds = Math.round((minPerKm - minutes) * 60);
  if (seconds === 60) {
    return `${minutes + 1}:00 min/km`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')} min/km`;
}

export function minKmToMph(input: string): string | null {
  const match = input.trim().match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  if (seconds >= 60 || (minutes === 0 && seconds === 0)) return null;
  const totalMinutes = minutes + seconds / 60;
  const kmPerHour = 60 / totalMinutes;
  const mph = kmPerHour / 1.60934;
  return `${Math.round(mph * 10) / 10} mph`;
}

export function registerConverterHandlers(db: Database.Database): void {
  ipcMain.handle('converter:convert', async (_event, args: { value: string; fromUnit: 'mph' | 'min_km' }) => {
    const { value, fromUnit } = args;
    let result: string | null;
    let toUnit: string;

    if (fromUnit === 'mph') {
      const num = parseFloat(value);
      if (isNaN(num)) throw new Error('Invalid number');
      result = mphToMinKm(num);
      toUnit = 'min_km';
    } else {
      result = minKmToMph(value);
      toUnit = 'mph';
    }

    if (result === null) throw new Error('Invalid input');

    db.prepare(
      'INSERT INTO conversion_history (input_value, input_unit, output_value, output_unit) VALUES (?, ?, ?, ?)'
    ).run(value, fromUnit, result, toUnit);

    const count = (db.prepare('SELECT COUNT(*) as count FROM conversion_history').get() as { count: number }).count;
    if (count > 10) {
      db.prepare(
        'DELETE FROM conversion_history WHERE id IN (SELECT id FROM conversion_history ORDER BY created_at ASC LIMIT ?)'
      ).run(count - 10);
    }

    return { result, toUnit };
  });

  ipcMain.handle('converter:getHistory', async () => {
    const rows = db
      .prepare('SELECT * FROM conversion_history ORDER BY created_at DESC LIMIT 10')
      .all() as Array<{
        id: number;
        input_value: string;
        input_unit: string;
        output_value: string;
        output_unit: string;
        created_at: string;
      }>;
    return rows.map((r) => ({
      id: r.id,
      inputValue: r.input_value,
      inputUnit: r.input_unit,
      outputValue: r.output_value,
      outputUnit: r.output_unit,
      createdAt: r.created_at,
    }));
  });
}
