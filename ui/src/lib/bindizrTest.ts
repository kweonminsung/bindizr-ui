import { getLocalApiHeaders } from "./localApi";

interface TestConnectionResult {
  ok: boolean;
  message: string;
}

export async function testBindizrConnection(
  bindizrUrl: string,
  secretKey: string,
): Promise<TestConnectionResult> {
  if (!bindizrUrl.startsWith("http://") && !bindizrUrl.startsWith("https://")) {
    return {
      ok: false,
      message: "Please enter a valid URL starting with http:// or https://",
    };
  }

  try {
    const res = await fetch("/api/public/bindizr/test", {
      method: "POST",
      headers: getLocalApiHeaders({ auth: false }),
      body: JSON.stringify({ bindizrUrl, secretKey }),
    });
    if (res.ok) {
      return { ok: true, message: "Connection successful!" };
    }
    const data = await res.json();
    return { ok: false, message: data.message || "Connection failed." };
  } catch {
    return { ok: false, message: "Failed to connect to the server." };
  }
}
