import type { AuthResponse, LoginPayload } from '#shared/types/auth'
import { setAuthSession, toPublicUser, verifyPassword } from '../../utils/auth'
import { findUserByEmail } from '../../utils/db'

export default defineEventHandler(async (event): Promise<AuthResponse> => {
  const body = await readBody<Partial<LoginPayload> & { mode?: 'user' | 'admin' }>(event)
  const rawIdentifier = typeof body?.email === 'string' ? body.email.trim().toLowerCase().replace(/\s+/g, ' ') : ''
  const password = typeof body?.password === 'string' ? body.password.trim() : ''
  const isAdminLogin = body?.mode === 'admin'

  let found = null
  if (isAdminLogin) {
    if (!password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Kata sandi admin wajib diisi.',
      })
    }
    found = (await findUserByEmail('admin@seruni.id')) || (await findUserByEmail('admin@sewain.id'))
    if (!found || found.role !== 'admin' || !verifyPassword(password, found.passwordHash)) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Kata sandi admin salah.',
      })
    }
  }
  else {
    if (!rawIdentifier || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email dan kata sandi wajib diisi.',
      })
    }
    found = await findUserByEmail(rawIdentifier)
    if (!found && (rawIdentifier === 'admin@sewain.id' || rawIdentifier === 'admin@seruni.id')) {
      found = (await findUserByEmail('admin@seruni.id')) || (await findUserByEmail('admin@sewain.id'))
    }

    if (!found || !verifyPassword(password, found.passwordHash)) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Email atau kata sandi salah.',
      })
    }
  }

  setAuthSession(event, found.id)
  return { user: toPublicUser(found) }
})
