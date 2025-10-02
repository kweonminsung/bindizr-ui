import { NextResponse } from "next/server";
import { setSetting } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  const { isEnabled, username, password } = await request.json();

  if (typeof isEnabled !== "boolean") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  if (isEnabled) {
    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password are required to enable an account." },
        { status: 400 }
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    setSetting("username", username);
    setSetting("password", hashedPassword);
  } else {
    setSetting("username", null);
    setSetting("password", null);
  }

  return NextResponse.json({
    message: `Account ${isEnabled ? "enabled" : "disabled"} successfully`,
  });
}

export async function PATCH(request: Request) {
  const { newUsername, newPassword } = await request.json();

  if (!newUsername) {
    return NextResponse.json(
      { message: "Username is required." },
      { status: 400 }
    );
  }

  // Update username
  setSetting("username", newUsername);

  // Optionally update password
  if (newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    setSetting("password", hashedPassword);
  }

  return NextResponse.json({ message: "Account updated successfully" });
}
