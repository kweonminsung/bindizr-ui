import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const dbPath = path.resolve(process.cwd(), "database.db");
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
const cronEnabled = db
  .prepare("SELECT value FROM settings WHERE key = 'cron_enabled'")
  .get();
if (!cronEnabled) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
    "cron_enabled",
    "false"
  );
}

const cronInterval = db
  .prepare("SELECT value FROM settings WHERE key = 'cron_interval'")
  .get();
if (!cronInterval) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
    "cron_interval",
    "3600"
  );
}

// Check if setup is complete
export function isSetupComplete(): boolean {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = 'setup_complete'")
    .get() as { value: string } | undefined;
  return row?.value === "true";
}

export function isAccountEnabled(): boolean {
  const usernameRow = db
    .prepare("SELECT value FROM settings WHERE key = 'username'")
    .get() as { value: string } | undefined;

  const passwordRow = db
    .prepare("SELECT value FROM settings WHERE key = 'password'")
    .get() as { value: string } | undefined;

  return !!(usernameRow?.value && passwordRow?.value);
}

export function getSetting(key: string): string | null {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string | null) {
  if (value === null) {
    db.prepare("DELETE FROM settings WHERE key = ?").run(key);
    return;
  }
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    key,
    value
  );
}

export function getNextAuthSecret(): string {
  const nextauthSecret = getSetting("nextauth_secret");

  if (nextauthSecret) {
    return nextauthSecret;
  }

  const secret = crypto.randomBytes(32).toString("hex");
  setSetting("nextauth_secret", secret);
  return secret;
}

export function addCronLog(message: string) {
  db.prepare("INSERT INTO cron_logs (message) VALUES (?)").run(message);
}

export function getCronLogs(
  limit: number,
  offset: number
): { id: number; timestamp: string; message: string }[] {
  return db
    .prepare("SELECT * FROM cron_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as {
    id: number;
    timestamp: string;
    message: string;
  }[];
}

export function getTotalCronLogs(): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM cron_logs").get() as {
    count: number;
  };
  return row.count;
}

export default db;
