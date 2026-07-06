import fs from "node:fs"
import path from "node:path"

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"

import * as schema from "~/server/db/schema"

const defaultDbPath = path.join(process.cwd(), "data", "activation.sqlite")
const dbPath = process.env.ACTIVATION_DB_PATH || defaultDbPath

const resolvedDbPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), dbPath)

// Ensure the DB directory exists
try {
  fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true })
} catch (err) {
  console.error("[db] Gagal membuat direktori database:", err)
  process.exit(1)
}

let sqlite: Database.Database
try {
  sqlite = new Database(resolvedDbPath)
} catch (err) {
  console.error("[db] Gagal membuka database:", resolvedDbPath, err)
  process.exit(1)
}

sqlite.pragma("journal_mode = WAL")

// Schema bootstrap — single source of truth is schema.ts (Drizzle)
// This CREATE TABLE IF NOT EXISTS stays in sync with schema.ts manually.
// TODO: migrate to drizzle-kit when schema changes are needed.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS activation_codes (
    code TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'REVOKED')),
    created_at TEXT NOT NULL,
    expires_at TEXT
  );
`)

export const db = drizzle(sqlite, { schema })
