import { NextResponse } from 'next/server';
import { postDnsConfig, reloadDns } from '@/lib/api';
import db from '@/lib/db';

let cronJob: NodeJS.Timeout | null = null;

const log = (message: string) => {
  db.prepare('INSERT INTO cron_logs (message) VALUES (?)').run(message);
  console.log(message);
};

async function runCron() {
  log('Running cron job...');
  try {
    await postDnsConfig();
    await reloadDns();
    log('Cron job completed successfully.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Cron job failed: ${errorMessage}`);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  const settings = db.prepare('SELECT * FROM cron_settings').get();
  const logs = db
    .prepare('SELECT * FROM cron_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?')
    .all(limit, offset);
  const totalLogs = db
    .prepare('SELECT COUNT(*) as count FROM cron_logs')
    .get() as { count: number };

  return NextResponse.json({ settings, logs, totalLogs: totalLogs.count });
}

export async function POST(request: Request) {
  const { enabled, interval } = await request.json();

  db.prepare('UPDATE cron_settings SET enabled = ?, interval = ?').run(
    enabled ? 1 : 0,
    interval
  );

  if (cronJob) {
    clearInterval(cronJob);
    cronJob = null;
  }

  if (enabled) {
    cronJob = setInterval(runCron, interval * 1000);
    runCron(); // Run immediately
  }

  return NextResponse.json({ success: true });
}

// Initialize cron job on startup
const settings = db.prepare('SELECT * FROM cron_settings').get() as {
  enabled: boolean;
  interval: number;
};
if (settings && settings.enabled) {
  cronJob = setInterval(runCron, settings.interval * 1000);
  runCron();
}
