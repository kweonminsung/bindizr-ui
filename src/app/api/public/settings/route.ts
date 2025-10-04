import { isSetupComplete, setSetting } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  if (isSetupComplete()) {
    return NextResponse.json(
      { message: "Setup has already been completed." },
      { status: 400 }
    );
  }

  const { bindizrUrl, secretKey, username, password } = await req.json();

  if (!bindizrUrl) {
    return NextResponse.json(
      { message: "Bindizr Server URL is required." },
      { status: 400 }
    );
  }

  try {
    setSetting("bindizr_url", bindizrUrl);
    if (secretKey) {
      setSetting("secret_key", secretKey);
    }

    if (username && password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      setSetting("username", username);
      setSetting("password", hashedPassword);
    }

    setSetting("setup_complete", "true");

    return NextResponse.json({ message: "Setup successful." });
  } catch (error) {
    console.error("Setup error:", error);

    return NextResponse.json(
      { message: "An error occurred during setup." },
      { status: 500 }
    );
  }
}
