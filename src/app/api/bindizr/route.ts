import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

export async function GET() {
  const bindizrUrl = getSetting("bindizr_url");
  const secretKey = getSetting("secret_key");
  return NextResponse.json({ bindizrUrl, secretKey });
}

export async function POST(request: Request) {
  const { bindizrUrl, secretKey } = await request.json();

  if (!bindizrUrl) {
    return NextResponse.json(
      { message: "Bindizr URL is a required field" },
      { status: 400 }
    );
  }

  setSetting("bindizr_url", bindizrUrl);
  setSetting("secret_key", secretKey || null);

  return NextResponse.json({
    message: "Bindizr settings updated successfully",
  });
}
