/**
 * Thin fetch wrapper that injects the access token, sets the tenant header
 * during local dev (where there is no subdomain), and surfaces RFC 7807
 * problem details as JS errors.
 *
 * Tokens are kept in localStorage for the MVP — production would move them
 * to an HTTP-only cookie set by the BFF (`apps/web/src/app/api`).
 */

export interface ApiError extends Error {
  status?: number;
  detail?: string;
  errors?: unknown;
}

const STORAGE_KEY = 'aqarflow:auth';

interface AuthState {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; tenantId: string; roles: string[] };
}

export function readAuth(): AuthState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AuthState) : null;
}

export function writeAuth(state: AuthState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

interface ApiInit extends RequestInit {
  /** When true (default), prepends /api before the path. */
  prefix?: boolean;
}

export async function api<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const { prefix = true, headers, ...rest } = init;
  const auth = readAuth();

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (auth?.accessToken) finalHeaders.Authorization = `Bearer ${auth.accessToken}`;
  if (auth?.user?.tenantId) finalHeaders['X-Tenant-Id'] = auth.user.tenantId;

  const url = prefix ? `/api${path}` : path;
  const res = await fetch(url, { ...rest, headers: finalHeaders });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!res.ok) {
    const err: ApiError = new Error(
      (data && typeof data === 'object' && 'detail' in data
        ? String((data as Record<string, unknown>).detail)
        : `Request failed (${res.status})`)
    );
    err.status = res.status;
    if (data && typeof data === 'object') {
      err.detail = (data as Record<string, unknown>).detail as string | undefined;
      err.errors = (data as Record<string, unknown>).errors;
    }
    throw err;
  }
  return data as T;
}
