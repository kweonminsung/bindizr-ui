import { NextResponse } from 'next/server';
import { postDnsConfig, reloadDns } from '@/lib/api';
import db, { getSetting, setSetting } from '@/lib/db';

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

  const enabled = getSetting('cron_enabled') === '1';
  const interval = parseInt(getSetting('cron_interval') || '300', 10);
  const settings = { enabled, interval };

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

  setSetting('cron_enabled', enabled ? '1' : '0');
  setSetting('cron_interval', interval.toString());

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
const cronEnabled = getSetting('cron_enabled') === '1';
const cronInterval = parseInt(getSetting('cron_interval') || '300', 10);

if (cronEnabled) {
  cronJob = setInterval(runCron, cronInterval * 1000);
  runCron();
}
