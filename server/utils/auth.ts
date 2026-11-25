import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import type { AuthUser, StoredUser } from '#shared/types/auth'
import { findUserById } from './db'

const COOKIE_NAME = 'sewain_session'
const SESSION_SECRET = process.env.SEWAIN_SESSION_SECRET || 'sewain-boutique-secret-key-2026'

export function hashPassword(password: string): string {
  return createHmac('sha256', SESSION_SECRET).update(password).digest('hex')
}

export function verifyPassword(password: string, hash: string): boolean {
  const candidate = hashPassword(password)
  const a = Buffer.from(candidate)
  const b = Buffer.from(hash)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function signUserId(userId: string): string {
  const sig = createHmac('sha256', SESSION_SECRET).update(userId).digest('hex')
  return `${userId}.${sig}`
}

function verifyToken(token: string): string | null {
  const idx = token.lastIndexOf('.')
  if (idx <= 0) return null
  const userId = token.slice(0, idx)
  const sig = token.slice(idx + 1)
  const expected = createHmac('sha256', SESSION_SECRET).update(userId).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return userId
}

export function toPublicUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatarInitials: user.avatarInitials,
  }
}

export function setAuthSession(event: H3Event, userId: string) {
  const token = signUserId(userId)
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function clearAuthSession(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null
  const userId = verifyToken(token)
  if (!userId) return null

  const found = await findUserById(userId)
  return found ? toPublicUser(found) : null
}

export async function requireAuthUser(event: H3Event): Promise<AuthUser> {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Silakan masuk terlebih dahulu untuk melanjutkan.',
    })
  }
  return user
}

export async function requireAdminUser(event: H3Event): Promise<AuthUser> {
  const user = await requireAuthUser(event)
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akses ditolak. Fitur ini hanya tersedia untuk Admin Butik.',
    })
  }
  return user
}
