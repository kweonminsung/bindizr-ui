import { NextResponse } from 'next/server';
import { postDnsConfig, reloadDns } from '@/lib/api';

let cronJob: NodeJS.Timeout | null = null;

async function runCron() {
  console.log('Running cron job...');
  try {
    await postDnsConfig();
    await reloadDns();
    console.log('Cron job completed successfully.');
  } catch (error) {
    console.error('Cron job failed:', error);
  }
}

export async function POST(request: Request) {
  const { enabled, interval } = await request.json();

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
