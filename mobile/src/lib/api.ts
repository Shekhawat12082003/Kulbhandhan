import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const ACCESS = 'kb_access';
const REFRESH = 'kb_refresh';
const isWeb = Platform.OS === 'web';

const webStorage = {
  async set(key: string, value: string) {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  async get(key: string) {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  async remove(key: string) {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) { super(message); }
}

export const tokens = {
  async save(a: string, r: string) {
    if (isWeb) {
      await webStorage.set(ACCESS, a);
      await webStorage.set(REFRESH, r);
      return;
    }
    await SecureStore.setItemAsync(ACCESS, a);
    await SecureStore.setItemAsync(REFRESH, r);
  },
  async clear() {
    if (isWeb) {
      await webStorage.remove(ACCESS);
      await webStorage.remove(REFRESH);
      return;
    }
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
  access: () => (isWeb ? webStorage.get(ACCESS) : SecureStore.getItemAsync(ACCESS)),
  refresh: () => (isWeb ? webStorage.get(REFRESH) : SecureStore.getItemAsync(REFRESH)),
};

async function raw(path: string, method: string, body?: unknown, token?: string | null) {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('NETWORK', 'Cannot reach the server. Check your connection.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.code ?? 'UNKNOWN', json.message ?? 'Something went wrong.', res.status);
  return json;
}

export async function api<T = any>(path: string, method = 'GET', body?: unknown, auth = true): Promise<T> {
  const token = auth ? await tokens.access() : null;
  try {
    return (await raw(path, method, body, token)).data ?? {};
  } catch (e) {
    if (auth && e instanceof ApiError && e.status === 401) {
      const rt = await tokens.refresh();
      if (!rt) throw e;
      try {
        const fresh = (await raw('/auth/refresh', 'POST', { refreshToken: rt })).data;
        await tokens.save(fresh.accessToken, fresh.refreshToken);
        return (await raw(path, method, body, fresh.accessToken)).data ?? {};
      } catch { await tokens.clear(); throw e; }
    }
    throw e;
  }
}

export const apiPublic = <T = any>(path: string, method = 'POST', body?: unknown) => api<T>(path, method, body, false);
