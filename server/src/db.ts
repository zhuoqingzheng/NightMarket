import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import { DB_PATH } from './config.ts';

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS merchants (
    id            INTEGER PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    contact_name  TEXT NOT NULL,
    business_name TEXT NOT NULL,
    cuisine       TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    merchant_id INTEGER NOT NULL REFERENCES merchants (id) ON DELETE CASCADE,
    expires_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    tagline     TEXT NOT NULL,
    description TEXT NOT NULL,
    venue       TEXT NOT NULL,
    address     TEXT NOT NULL,
    starts_at   TEXT NOT NULL,
    ends_at     TEXT NOT NULL,
    theme       TEXT NOT NULL,
    map_top     TEXT NOT NULL,
    map_bottom  TEXT NOT NULL,
    centerpiece TEXT,
    grid_rows   INTEGER NOT NULL,
    grid_cols   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stalls (
    id          INTEGER PRIMARY KEY,
    event_id    INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    label       TEXT NOT NULL,
    grid_row    INTEGER NOT NULL,
    grid_col    INTEGER NOT NULL,
    tier        TEXT NOT NULL CHECK (tier IN ('prime', 'corner', 'standard')),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    UNIQUE (event_id, label),
    UNIQUE (event_id, grid_row, grid_col)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id           INTEGER PRIMARY KEY,
    reference    TEXT NOT NULL UNIQUE,
    event_id     INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    stall_id     INTEGER NOT NULL REFERENCES stalls (id) ON DELETE CASCADE,
    merchant_id  INTEGER NOT NULL REFERENCES merchants (id) ON DELETE CASCADE,
    price_cents  INTEGER NOT NULL,
    status       TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    cancelled_at TEXT
  );

  -- First come, first served is enforced by the database itself: a stall can only ever have
  -- one confirmed booking, so two merchants clicking at the same instant can never both win.
  CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_per_stall
    ON bookings (stall_id) WHERE status = 'confirmed';
  CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_per_merchant_per_event
    ON bookings (event_id, merchant_id) WHERE status = 'confirmed';

  CREATE INDEX IF NOT EXISTS stalls_by_event ON stalls (event_id);
  CREATE INDEX IF NOT EXISTS bookings_by_merchant ON bookings (merchant_id, status);
`);

const statements = new Map<string, StatementSync>();

function prepare(sql: string): StatementSync {
  let statement = statements.get(sql);
  if (!statement) {
    statement = db.prepare(sql);
    statements.set(sql, statement);
  }
  return statement;
}

export function queryOne<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
  return prepare(sql).get(...params) as unknown as T | undefined;
}

export function queryAll<T>(sql: string, ...params: SQLInputValue[]): T[] {
  return prepare(sql).all(...params) as unknown as T[];
}

export function execute(sql: string, ...params: SQLInputValue[]) {
  return prepare(sql).run(...params);
}

export function transaction<T>(work: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const SQLITE_CONSTRAINT_UNIQUE = 2067;

/** Returns the "table.column" list from a UNIQUE violation, or null for any other error. */
export function uniqueViolation(error: unknown): string | null {
  if (!(error instanceof Error) || (error as { errcode?: number }).errcode !== SQLITE_CONSTRAINT_UNIQUE) {
    return null;
  }
  return error.message.replace(/^.*UNIQUE constraint failed:\s*/, '');
}

export const nowIso = () => new Date().toISOString();
