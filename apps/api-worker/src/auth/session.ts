import type { Kysely } from 'kysely';
import type { Database, UserRow } from '../db/schema';

export const SESSION_COOKIE = 'sip_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const encoder = new TextEncoder();

function base64urlEncode(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const std = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(std);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return base64urlEncode(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(sessionId: string, secret: string): Promise<string> {
  const sig = await hmac(secret, sessionId);
  return `${sessionId}.${sig}`;
}

export async function verifySigned(value: string, secret: string): Promise<string | null> {
  const idx = value.indexOf('.');
  if (idx <= 0) return null;
  const sessionId = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = await hmac(secret, sessionId);
  return timingSafeEqual(sig, expected) ? sessionId : null;
}

export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) === name) return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return null;
}

export function buildSessionCookie(value: string, secure: boolean, maxAgeSeconds: number): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearSessionCookie(secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export async function createSession(
  db: Kysely<Database>,
  userId: string,
  userAgent: string | null,
): Promise<{ sessionId: string; expiresAtMs: number }> {
  const sessionId = randomToken(32);
  const now = Date.now();
  const expiresAtMs = now + SESSION_TTL_MS;
  await db
    .insertInto('auth_sessions')
    .values({
      id: sessionId,
      user_id: userId,
      expires_at_ms: expiresAtMs,
      created_at_ms: now,
      last_seen_at_ms: now,
      user_agent: userAgent,
    })
    .execute();
  return { sessionId, expiresAtMs };
}

export async function resolveSessionUser(
  db: Kysely<Database>,
  cookieHeader: string | null | undefined,
  secret: string,
): Promise<UserRow | null> {
  const cookieValue = readCookie(cookieHeader, SESSION_COOKIE);
  if (!cookieValue) return null;
  const sessionId = await verifySigned(cookieValue, secret);
  if (!sessionId) return null;
  const row = await db
    .selectFrom('auth_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();
  if (!row) return null;
  if (row.expires_at_ms < Date.now()) {
    await db.deleteFrom('auth_sessions').where('id', '=', sessionId).execute();
    return null;
  }
  await db
    .updateTable('auth_sessions')
    .set({ last_seen_at_ms: Date.now() })
    .where('id', '=', sessionId)
    .execute();
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('id', '=', row.user_id)
    .executeTakeFirst();
  return user ?? null;
}

export async function destroySession(
  db: Kysely<Database>,
  cookieHeader: string | null | undefined,
  secret: string,
): Promise<void> {
  const cookieValue = readCookie(cookieHeader, SESSION_COOKIE);
  if (!cookieValue) return;
  const sessionId = await verifySigned(cookieValue, secret);
  if (!sessionId) return;
  await db.deleteFrom('auth_sessions').where('id', '=', sessionId).execute();
}

export { base64urlEncode, base64urlDecode };
