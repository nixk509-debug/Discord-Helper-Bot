export function getApiBaseUrl(): string {
  const envBase = (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined)?.trim();
  if (envBase) return envBase.replace(/\/$/, "");
  return "";
}

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

export async function fetchJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  const url = buildApiUrl(path);
  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch {}
    console.error(`[API] ${init?.method || "GET"} ${path} failed (${res.status})`, text?.slice(0, 300));
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  return await res.json();
}
