const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function request(method: string, path: string, body?: any) {
  const opts: RequestInit = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const apiClient = {
  get: (path: string) => request("GET", path),
  post: (path: string, body?: any) => request("POST", path, body),
  put: (path: string, body?: any) => request("PUT", path, body),
  patch: (path: string, body?: any) => request("PATCH", path, body),
  delete: (path: string) => request("DELETE", path),
};
