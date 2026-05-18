import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: number;
  updatedAt: number;
}

const API = '/api/auth';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export const isWebAuthnSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return browserSupportsWebAuthn();
};

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(`${API}/me`, { credentials: 'include' });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: AuthUser | null };
  return data.user;
}

export async function register(args: { email: string; displayName: string }): Promise<AuthUser> {
  const { options } = await postJson<{ options: Parameters<typeof startRegistration>[0]['optionsJSON'] }>(
    '/register/options',
    args,
  );
  const response = await startRegistration({ optionsJSON: options });
  const { user } = await postJson<{ user: AuthUser }>('/register/verify', {
    email: args.email,
    response,
  });
  return user;
}

export async function login(args: { email?: string } = {}): Promise<AuthUser> {
  const { options } = await postJson<{ options: Parameters<typeof startAuthentication>[0]['optionsJSON'] }>(
    '/login/options',
    args,
  );
  const response = await startAuthentication({ optionsJSON: options });
  const { user } = await postJson<{ user: AuthUser }>('/login/verify', { response });
  return user;
}

export async function logout(): Promise<void> {
  await postJson('/logout', {});
}
