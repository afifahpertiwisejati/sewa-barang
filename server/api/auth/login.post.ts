import type { AuthResponse, LoginPayload } from '#shared/types/auth'
import { setAuthSession, toPublicUser, verifyPassword } from '../../utils/auth'
import { findUserByEmail } from '../../utils/db'

const ADMIN_SECRET_USERNAME = 'admin 123'

export default defineEventHandler(async (event): Promise<AuthResponse> => {
  const body = await readBody<Partial<LoginPayload> & { mode?: 'user' | 'admin' }>(event)
  const rawIdentifier = typeof body?.email === 'string' ? body.email.trim().toLowerCase().replace(/\s+/g, ' ') : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const isAdminLogin = body?.mode === 'admin'

  if (!rawIdentifier || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: isAdminLogin
        ? 'Username dan kata sandi admin wajib diisi.'
        : 'Email dan kata sandi wajib diisi.',
    })
  }

  let found = null
  if (isAdminLogin) {
    if (rawIdentifier !== ADMIN_SECRET_USERNAME) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Username atau kata sandi admin salah.',
      })
    }
    found = (await findUserByEmail('admin@seruni.id')) || (await findUserByEmail('admin@sewain.id'))
    if (!found || found.role !== 'admin' || !verifyPassword(password, found.passwordHash)) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Username atau kata sandi admin salah.',
      })
    }
  }
  else {
    found = await findUserByEmail(rawIdentifier)
    if (!found && (rawIdentifier === 'admin@sewain.id' || rawIdentifier === 'admin@seruni.id' || rawIdentifier === ADMIN_SECRET_USERNAME)) {
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
