/// <reference types="@cloudflare/workers-types" />

const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16
const HASH_BITS = 256
const SESSION_TTL_DAYS = 30
const SESSION_COOKIE = 'iris_session'

export interface User {
  id: string
  email: string
  password_hash: string
  created_at: number
}

// ---- Password hashing (PBKDF2 via Web Crypto, no deps) ----

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS)
  return `${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 3) return false
  const iterations = parseInt(parts[0], 10)
  const salt = unb64(parts[1])
  const expected = unb64(parts[2])
  if (!iterations || !salt || !expected) return false
  const actual = await pbkdf2(password, salt, iterations)
  return constantTimeEqual(actual, expected)
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    HASH_BITS,
  )
  return new Uint8Array(bits)
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function b64(buf: Uint8Array): string {
  let s = ''
  for (const byte of buf) s += String.fromCharCode(byte)
  return btoa(s)
}

function unb64(str: string): Uint8Array | null {
  try {
    const bin = atob(str)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

// ---- Session token + cookie helpers ----

export function newSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function newId(): string {
  // Short opaque IDs — enough entropy for a hackathon
  return b64(crypto.getRandomValues(new Uint8Array(12)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function sessionCookieFromRequest(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || ''
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === SESSION_COOKIE) return v.join('=')
  }
  return null
}

export function setSessionCookieHeader(token: string): string {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

// ---- DB lookups ----

export async function getCurrentUser(
  db: D1Database,
  request: Request,
): Promise<{ user: User; sessionToken: string } | null> {
  const token = sessionCookieFromRequest(request)
  if (!token) return null
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.password_hash, u.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .bind(token)
    .first<User & { expires_at: number }>()
  if (!row) return null
  if (row.expires_at < nowSec()) {
    // Best-effort cleanup; ignore errors
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run().catch(() => {})
    return null
  }
  return {
    user: {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      created_at: row.created_at,
    },
    sessionToken: token,
  }
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = newSessionToken()
  const now = nowSec()
  const expires = now + SESSION_TTL_DAYS * 24 * 60 * 60
  await db
    .prepare(
      `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    )
    .bind(token, userId, now, expires)
    .run()
  return token
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000)
}

// ---- Email + password validation ----

export function normalizeEmail(s: unknown): string | null {
  if (typeof s !== 'string') return null
  const trimmed = s.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null
  if (trimmed.length > 254) return null
  return trimmed
}

export function validatePassword(s: unknown): string | null {
  if (typeof s !== 'string') return null
  if (s.length < 8) return null
  if (s.length > 256) return null
  return s
}
