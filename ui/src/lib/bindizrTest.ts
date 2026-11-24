import { getLocalApiHeaders } from "./localApi";

interface TestConnectionResult {
  ok: boolean;
  message: string;
}

export async function testBindizrConnection(
  bindizrUrl: string,
  secretKey: string,
): Promise<TestConnectionResult> {
  try {
    const res = await fetch("/api/public/bindizr/test", {
      method: "POST",
      headers: getLocalApiHeaders(),
      body: JSON.stringify({ bindizrUrl, secretKey }),
    });
    if (res.ok) {
      return { ok: true, message: "Connection successful!" };
    }
    const data = await res.json().catch(() => null);
    return { ok: false, message: data?.message || "Connection failed." };
  } catch {
    return { ok: false, message: "Failed to connect to the server." };
  }
}
