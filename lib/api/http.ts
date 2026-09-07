/* The fetch wrapper. Access tokens, JSON, and errors that say which call failed. */

import { API_BASE, ApiError } from './config';

const ACCESS_KEY = 'hz-access-token';
/* A tablet in a restaurant is not a person. The staff endpoints authenticate the *device*,
   which is bound to one venue and geofenced, so its token is stored and sent separately —
   sending a diner's access token to /v1/staff/state would be asking the wrong question. */
const DEVICE_KEY = 'haazir-device-token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(ACCESS_KEY, token);
    else window.localStorage.removeItem(ACCESS_KEY);
  } catch {
    /* private mode; the session simply does not survive a reload */
  }
}

export function getDeviceToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
}

export function setDeviceToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(DEVICE_KEY, token);
    else window.localStorage.removeItem(DEVICE_KEY);
  } catch {
    /* private mode */
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Return null on 401/404 instead of throwing. For "may legitimately be absent". */
  nullable?: boolean;
  /** Authenticate as the enrolled device rather than as the signed-in person. */
  asDevice?: boolean;
  /** An explicit bearer, for the group guest session: it is scoped to one group and one
   *  slot, so it is held per group rather than as "the" session. */
  bearer?: string | null;
}

export async function call<T>(path: string, opts: Options = {}): Promise<T | null> {
  const { method = 'GET', body, nullable = false, asDevice = false, bearer } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = bearer !== undefined ? bearer : asDevice ? getDeviceToken() : getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      // The refresh token is an httpOnly cookie the API sets; it has to ride along.
      credentials: 'include',
    });
  } catch (cause) {
    // A network failure is not a 500 — say so, because the two are fixed differently.
    throw new ApiError(0, path, `Could not reach the API at ${API_BASE}${path}`);
  }

  if (res.status === 204) return null;
  if (!res.ok) {
    if (nullable && (res.status === 404 || res.status === 401)) return null;
    let detail = res.statusText;
    try {
      const j = await res.json();
      if (typeof j?.detail === 'string') detail = j.detail;
    } catch {
      /* not JSON; statusText is what we have */
    }
    throw new ApiError(res.status, path, `${method} ${path} → ${res.status}: ${detail}`);
  }
  return (await res.json()) as T;
}
