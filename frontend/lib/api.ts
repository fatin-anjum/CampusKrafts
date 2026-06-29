/**
 * Typed fetch wrapper for the CampusKrafts backend.
 *  - attaches the Bearer access token
 *  - unwraps the `{ data }` success envelope
 *  - surfaces `{ error: { code, message } }` as a thrown ApiError
 *  - transparently refreshes the access token once on 401
 */

const BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

const ACCESS_KEY = 'ck_access';
const REFRESH_KEY = 'ck_refresh';

export const tokenStore = {
  get access() {
    return typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function raw<T>(path: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...(headers as Record<string, string>) };
  if (auth && tokenStore.access) h['Authorization'] = `Bearer ${tokenStore.access}`;

  const res = await fetch(`${BASE}${path}`, { ...rest, headers: h });

  if (res.status === 204) return undefined as T;

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(err?.message || res.statusText || 'Request failed', err?.code || 'ERROR', res.status);
  }
  return (body?.data !== undefined ? body.data : body) as T;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  try {
    const data = await raw<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ refreshToken: refresh }),
    });
    tokenStore.set(data.accessToken);
    return true;
  } catch {
    tokenStore.clear();
    return false;
  }
}

export async function api<T>(path: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
  try {
    return await raw<T>(path, options);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && options.auth !== false) {
      const ok = await tryRefresh();
      if (ok) return raw<T>(path, options);
    }
    throw e;
  }
}

// Convenience helpers
export const apiGet = <T>(path: string) => api<T>(path, { method: 'GET' });
export const apiPost = <T>(path: string, body?: unknown, auth = true) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, auth });
export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
export const apiPut = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' });
