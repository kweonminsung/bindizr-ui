import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'database.db');
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS cron_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enabled BOOLEAN NOT NULL,
    interval INTEGER NOT NULL
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
const settings = db.prepare('SELECT * FROM cron_settings').get();
if (!settings) {
  db.prepare('INSERT INTO cron_settings (enabled, interval) VALUES (?, ?)').run(
    0,
    300
  );
}

export default db;
