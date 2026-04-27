import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../src/main/db/migrations';
import { seedData } from '../src/main/db/seed';

const handlers = new Map<string, Function>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: Function) => {
      handlers.set(channel, fn);
    },
  },
}));

async function invoke(channel: string, args?: unknown) {
  const fn = handlers.get(channel);
  if (!fn) throw new Error(`No handler registered for ${channel}`);
  return fn({}, args);
}

describe('Calorie IPC handlers (regression: add item must persist and appear)', () => {
  let db: Database.Database;

  beforeEach(async () => {
    handlers.clear();
    db = new Database(':memory:');
    runMigrations(db);
    seedData(db);
    const { registerCalorieHandlers } = await import('../src/main/ipc/calorieLib');
    registerCalorieHandlers(db);
  });

  it('calorie:getAll returns seeded items (not empty [])', async () => {
    const items = await invoke('calorie:getAll');
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(24);
    expect(items[0]).toHaveProperty('id');
    expect(items[0]).toHaveProperty('name');
    expect(items[0]).toHaveProperty('category');
  });

  it('calorie:create returns the new item with id (not {})', async () => {
    const created = await invoke('calorie:create', {
      name: '鸡蛋',
      calories: '50',
      category: '主食',
      sortOrder: 99,
      isPreset: false,
    });
    expect(created).toHaveProperty('id');
    expect(created.id).toBeGreaterThan(0);
    expect(created.name).toBe('鸡蛋');
    expect(created.calories).toBe('50');
    expect(created.category).toBe('主食');
    expect(created.isPreset).toBe(false);
  });

  it('calorie:getAll includes newly created item', async () => {
    await invoke('calorie:create', {
      name: 'NewTestItem',
      calories: '123',
      category: '小食',
      sortOrder: 1,
      isPreset: false,
    });
    const items = await invoke('calorie:getAll');
    const found = items.find((i: { name: string }) => i.name === 'NewTestItem');
    expect(found).toBeDefined();
    expect(found.calories).toBe('123');
    expect(found.category).toBe('小食');
  });

  it('calorie:update persists changes', async () => {
    const created = await invoke('calorie:create', {
      name: 'BeforeEdit',
      calories: '100',
      category: '酒',
      sortOrder: 1,
      isPreset: false,
    });
    const updated = await invoke('calorie:update', {
      id: created.id,
      name: 'AfterEdit',
      calories: '200',
      category: '酒',
      sortOrder: 1,
      isPreset: false,
    });
    expect(updated.name).toBe('AfterEdit');
    expect(updated.calories).toBe('200');
  });

  it('calorie:delete removes the item', async () => {
    const created = await invoke('calorie:create', {
      name: 'ToDelete',
      calories: '50',
      category: '主食',
      sortOrder: 1,
      isPreset: false,
    });
    await invoke('calorie:delete', { id: created.id });
    const items = await invoke('calorie:getAll');
    const found = items.find((i: { name: string }) => i.name === 'ToDelete');
    expect(found).toBeUndefined();
  });
});

describe('Converter IPC handlers (regression: 5.2 mph must convert)', () => {
  let db: Database.Database;

  beforeEach(async () => {
    handlers.clear();
    db = new Database(':memory:');
    runMigrations(db);
    const { registerConverterHandlers } = await import('../src/main/ipc/converter');
    registerConverterHandlers(db);
  });

  it('converter:convert 5.2 mph returns 7:10 min/km', async () => {
    const res = await invoke('converter:convert', { value: '5.2', fromUnit: 'mph' });
    expect(res.result).toBe('7:10 min/km');
    expect(res.toUnit).toBe('min_km');
  });

  it('converter:convert saves to history', async () => {
    await invoke('converter:convert', { value: '5.2', fromUnit: 'mph' });
    const history = await invoke('converter:getHistory');
    expect(history.length).toBe(1);
    expect(history[0].inputValue).toBe('5.2');
    expect(history[0].outputValue).toBe('7:10 min/km');
  });

  it('converter:convert min/km to mph works', async () => {
    const res = await invoke('converter:convert', { value: '6:46', fromUnit: 'min_km' });
    expect(res.toUnit).toBe('mph');
    const mph = parseFloat(res.result);
    expect(mph).toBeGreaterThan(5);
    expect(mph).toBeLessThan(6);
  });

  it('converter:convert rejects invalid input', async () => {
    await expect(invoke('converter:convert', { value: 'abc', fromUnit: 'mph' })).rejects.toThrow();
  });
});

describe('Main process wiring (regression: no stub handlers)', () => {
  it('index.ts imports all real handler registrars', () => {
    const indexSource = fs.readFileSync(
      path.resolve(__dirname, '../src/main/index.ts'),
      'utf-8'
    );
    expect(indexSource).toContain('registerCalorieHandlers');
    expect(indexSource).toContain('registerDailyHandlers');
    expect(indexSource).toContain('registerTrainingHandlers');
    expect(indexSource).toContain('registerConverterHandlers');
  });

  it('index.ts does not contain stub handlers', () => {
    const indexSource = fs.readFileSync(
      path.resolve(__dirname, '../src/main/index.ts'),
      'utf-8'
    );
    expect(indexSource).not.toContain('registerStubHandlers');
    expect(indexSource).not.toMatch(/ipcMain\.handle\('calorie:getAll',\s*async\s*\(\)\s*=>\s*\[\]\)/);
    expect(indexSource).not.toMatch(/ipcMain\.handle\('calorie:create',\s*async\s*\(\)\s*=>\s*\({}\)\)/);
  });
});
