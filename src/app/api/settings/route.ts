import { isAccountEnabled, isSetupComplete } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    setupComplete: isSetupComplete(),
    accountEnabled: isAccountEnabled(),
  });
}
