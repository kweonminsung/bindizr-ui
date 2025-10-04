import { NextResponse } from "next/server";
import { postDnsConfig, reloadDns } from "@/lib/api";
import {
  getSetting,
  setSetting,
  addCronLog,
  getCronLogs,
  getTotalCronLogs,
} from "@/lib/db";

let cronJob: NodeJS.Timeout | null = null;

const log = (message: string) => {
  addCronLog(message);
  console.log(message);
};

async function runCron() {
  log("Running cron job...");
  try {
    await postDnsConfig();
    await reloadDns();
    log("Cron job completed successfully.");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Cron job failed: ${errorMessage}`);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = (page - 1) * limit;

  const enabled = getSetting("cron_enabled") === "true";
  const interval = parseInt(getSetting("cron_interval") || "300", 10);
  const settings = { enabled, interval };

  const logs = getCronLogs(limit, offset);
  const totalLogs = getTotalCronLogs();

  return NextResponse.json({ settings, logs, totalLogs });
}

export async function POST(request: Request) {
  const { enabled, interval } = await request.json();

  setSetting("cron_enabled", enabled ? "true" : "false");
  setSetting("cron_interval", interval.toString());

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
const cronEnabled = getSetting("cron_enabled") === "true";
const cronInterval = parseInt(getSetting("cron_interval") || "300", 10);

if (cronEnabled) {
  cronJob = setInterval(runCron, cronInterval * 1000);
  runCron();
}
