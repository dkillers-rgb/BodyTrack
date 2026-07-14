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
      phone TEXT,
      external_id TEXT,
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
      visceral_fat REAL,
      image_path TEXT,
      raw_ocr_text TEXT,
      ai_analysis TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_evaluations_client_date
      ON evaluations(client_id, exam_date);
  `);

  try {
    await db.execAsync(`ALTER TABLE evaluations ADD COLUMN raw_report_json TEXT`);
  } catch {
    /* coluna já existe */
  }

  try {
    await db.execAsync(`ALTER TABLE clients ADD COLUMN phone TEXT`);
  } catch {
    /* coluna já existe */
  }

  try {
    await db.execAsync(`ALTER TABLE evaluations ADD COLUMN visceral_fat REAL`);
  } catch {
    /* coluna já existe */
  }

  try {
    await db.execAsync(`ALTER TABLE clients ADD COLUMN external_id TEXT`);
  } catch {
    /* coluna já existe */
  }

  try {
    await db.execAsync(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_external_id ON clients(external_id) WHERE external_id IS NOT NULL AND TRIM(external_id) != ''`
    );
  } catch {
    /* índice indisponível (ex.: IDs duplicados já existentes) */
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      logo_path TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const companyRow = await db.getFirstAsync<{ id: number }>('SELECT id FROM company_settings WHERE id = 1');
  if (!companyRow) {
    await db.runAsync(
      `INSERT INTO company_settings (id, name, address, phone) VALUES (1, '', '', '')`
    );
  }

  return db;
}

export async function initDatabase(): Promise<void> {
  await getDatabase();
}

/** Fecha a conexão aberta (necessário antes de copiar/substituir o arquivo .db). */
export async function closeDatabase(): Promise<void> {
  if (!db) return;
  try {
    await db.closeAsync();
  } finally {
    db = null;
  }
}
