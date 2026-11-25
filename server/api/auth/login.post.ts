import type { AuthResponse, LoginPayload } from '#shared/types/auth'
import { setAuthSession, toPublicUser, verifyPassword } from '../../utils/auth'
import { findUserByEmail } from '../../utils/db'

export default defineEventHandler(async (event): Promise<AuthResponse> => {
  const body = await readBody<Partial<LoginPayload>>(event)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email dan kata sandi wajib diisi.',
    })
  }

  let found = await findUserByEmail(email)
  if (!found && (email === 'admin@sewain.id' || email === 'admin@seruni.id')) {
    found = await findUserByEmail(email === 'admin@sewain.id' ? 'admin@seruni.id' : 'admin@sewain.id')
  }

  if (!found || !verifyPassword(password, found.passwordHash)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Email atau kata sandi salah.',
    })
  }

  setAuthSession(event, found.id)
  return { user: toPublicUser(found) }
})
