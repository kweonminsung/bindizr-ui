import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'database.db');
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);


db.exec(`
  CREATE TABLE IF NOT EXISTS cron_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    message TEXT NOT NULL
  );
`);

// Initialize settings if not present
const cronEnabled = db.prepare("SELECT value FROM settings WHERE key = 'cron_enabled'").get();
if (!cronEnabled) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('cron_enabled', '0');
}

const cronInterval = db.prepare("SELECT value FROM settings WHERE key = 'cron_interval'").get();
if (!cronInterval) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('cron_interval', '300');
}

// Check if setup is complete
export function isSetupComplete() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'setup_complete'").get() as { value: string } | undefined;
  return row?.value === 'true';
}

export function isAccountEnabled() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'username'").get() as { value: string } | undefined;
  return !!row;
}

export function getSetting(key: string): string | null {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    key,
    value
  );
}

export default db;
