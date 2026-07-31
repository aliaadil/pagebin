/**
 * pagebin database layer — better-sqlite3 wrapper.
 *
 * Schema is intentionally tiny: one `pastes` table that owns both metadata
 * and the on-disk path to the rendered HTML. We keep HTML out of the DB so
 * large pastes don't bloat sqlite and so serving can stream from disk.
 */
import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = process.env.PAGEBIN_DATA_DIR ?? './data';
const DB_PATH = join(DATA_DIR, 'pagebin.db');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.exec(`
    CREATE TABLE IF NOT EXISTS pastes (
      id          TEXT PRIMARY KEY,
      html_path   TEXT NOT NULL,
      title       TEXT,
      byte_size   INTEGER NOT NULL,
      created_at  INTEGER NOT NULL,
      expires_at  INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_pastes_expires_at ON pastes(expires_at);
  `);
  return _db;
}

export interface PasteRow {
  id: string;
  html_path: string;
  title: string | null;
  byte_size: number;
  created_at: number;
  expires_at: number | null;
}

export function insertPaste(row: PasteRow): void {
  getDb()
    .prepare(
      `INSERT INTO pastes (id, html_path, title, byte_size, created_at, expires_at)
       VALUES (@id, @html_path, @title, @byte_size, @created_at, @expires_at)`
    )
    .run(row);
}

export function getPaste(id: string): PasteRow | undefined {
  return getDb()
    .prepare('SELECT * FROM pastes WHERE id = ?')
    .get(id) as PasteRow | undefined;
}

export function deletePaste(id: string): boolean {
  const res = getDb().prepare('DELETE FROM pastes WHERE id = ?').run(id);
  return res.changes > 0;
}

export function listPastes(): PasteRow[] {
  return getDb()
    .prepare('SELECT * FROM pastes ORDER BY created_at DESC LIMIT 200')
    .all() as PasteRow[];
}

/**
 * Sweep expired pastes from disk + DB. Returns the number of rows deleted.
 * Cheap enough to run on every request (microseconds for empty expiry queue).
 */
export function sweepExpired(): number {
  const now = Math.floor(Date.now() / 1000);
  const expired = getDb()
    .prepare('SELECT id, html_path FROM pastes WHERE expires_at IS NOT NULL AND expires_at < ?')
    .all(now) as { id: string; html_path: string }[];
  if (expired.length === 0) return 0;
  const del = getDb().prepare('DELETE FROM pastes WHERE id = ?');
  for (const row of expired) {
    try {
      // Best-effort: file may already be gone, ignore ENOENT.
      require('node:fs').unlinkSync(row.html_path);
    } catch {
      // ignore
    }
    del.run(row.id);
  }
  return expired.length;
}
