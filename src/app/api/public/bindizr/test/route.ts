import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { bindizrUrl, secretKey } = await req.json();

  if (!bindizrUrl) {
    return NextResponse.json(
      { message: "Bindizr Server URL is required." },
      { status: 400 }
    );
  }

  try {
    const headers: { [key: string]: string } = {};
    if (secretKey) {
      headers["Authorization"] = `Bearer ${secretKey}`;
    }

    const response = await fetch(`${bindizrUrl}/zones`, { headers });

    if (response.ok) {
      return NextResponse.json({ message: "Connection successful." });
    } else {
      return NextResponse.json(
        { message: `Connection failed: ${response.statusText}` },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error("Connection test error:", error);

    return NextResponse.json(
      { message: "Failed to connect to the server." },
      { status: 500 }
    );
  }
}
