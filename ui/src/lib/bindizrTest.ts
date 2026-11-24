import { readResponseError } from "./errors";
import { getLocalApiHeaders } from "./localApi";

interface TestConnectionResult {
  ok: boolean;
  message: string;
}

export async function testBindizrConnection(
  bindizrUrl: string,
  apiToken: string,
): Promise<TestConnectionResult> {
  try {
    const res = await fetch("/api/public/bindizr/test", {
      method: "POST",
      headers: getLocalApiHeaders(),
      body: JSON.stringify({ bindizrUrl, apiToken }),
    });
    if (res.ok) {
      return { ok: true, message: "Connection successful!" };
    }
    const { message } = await readResponseError(res, "Connection failed.");
    return { ok: false, message };
  } catch {
    return { ok: false, message: "Failed to connect to the server." };
  }
}
