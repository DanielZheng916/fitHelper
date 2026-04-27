import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbDir = process.env.FITHELPER_DB_DIR || path.join(os.homedir(), '.fithelper');
  fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, 'fithelper.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}

export function getDbFromInstance(instance: Database.Database): Database.Database {
  return instance;
}
