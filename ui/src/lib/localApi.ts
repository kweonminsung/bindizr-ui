interface LocalApiHeaderOptions {
  auth?: boolean;
}

export function getLocalApiHeaders({
  auth = true,
}: LocalApiHeaderOptions = {}): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = localStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}
