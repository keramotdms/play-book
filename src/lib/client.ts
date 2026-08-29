const TOKEN_KEY = "cp_session_token";

// Session token persistence (localStorage): the preview panel may embed the
// app in a cross-site iframe where the browser drops cookies entirely. The
// token is sent as an Authorization header, which is unaffected by that.
export function saveSessionToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable (sandboxed iframe) — cookie path still works */
  }
}

export function clearSessionToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

function loadSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const token = loadSessionToken();
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // A 401 means the token (if any) is no longer valid — drop it so the
    // next request falls back to the cookie, and the UI can show login.
    if (res.status === 401) clearSessionToken();
    throw new Error(
      typeof data.error === "string" ? data.error : `Request failed (${res.status})`
    );
  }
  return data as T;
}

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api<{ url: string }>("/api/upload", {
    method: "POST",
    body: form,
  });
  return res.url;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}
