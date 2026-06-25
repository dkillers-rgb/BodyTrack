import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('bodytrack.db');

  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('MALE', 'FEMALE', 'OTHER')),
      age INTEGER NOT NULL,
      height REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY NOT NULL,
      client_id INTEGER NOT NULL,
      exam_date TEXT NOT NULL,
      weight REAL NOT NULL,
      skeletal_muscle REAL NOT NULL,
      body_fat REAL NOT NULL,
      image_path TEXT,
      raw_ocr_text TEXT,
      ai_analysis TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_evaluations_client_date
      ON evaluations(client_id, exam_date);
  `);

  return db;
}

export async function initDatabase(): Promise<void> {
  await getDatabase();
}
