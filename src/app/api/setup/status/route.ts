import { NextResponse } from "next/server";
import { isSetupComplete, isAccountEnabled } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    setupComplete: isSetupComplete(),
    accountEnabled: isAccountEnabled(),
  });
}
