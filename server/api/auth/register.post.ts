import type { AuthResponse, RegisterPayload, StoredUser } from '#shared/types/auth'
import { hashPassword, setAuthSession, toPublicUser } from '../../utils/auth'
import { createNotification, findUserByEmail, insertUser } from '../../utils/db'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'SW'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
}

export default defineEventHandler(async (event): Promise<AuthResponse> => {
  const body = await readBody<Partial<RegisterPayload>>(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!name || name.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Nama lengkap minimal 2 karakter.' })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Format email tidak valid.' })
  }
  if (!phone || phone.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Nomor WhatsApp minimal 8 digit.' })
  }
  if (!password || password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Kata sandi minimal 6 karakter.' })
  }

  const existing = await findUserByEmail(email)
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email sudah terdaftar. Silakan masuk menggunakan akun tersebut.',
    })
  }

  const newUser: StoredUser = {
    id: `user-${Date.now().toString(36)}`,
    name,
    email,
    phone,
    role: 'user',
    avatarInitials: getInitials(name),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  }

  await insertUser(newUser)

  await Promise.allSettled([
    createNotification({
      recipientRole: 'admin',
      type: 'system',
      title: 'Penyewa Baru Terdaftar',
      message: `${newUser.name} (${newUser.email} • ${newUser.phone}) baru saja mendaftar sebagai penyewa di SewaIn+.`,
      actionUrl: '/admin',
    }),
    createNotification({
      userId: newUser.id,
      recipientRole: 'user',
      type: 'system',
      title: 'Selamat Datang di SewaIn+',
      message: `Halo ${newUser.name}! Akun penyewa Anda sudah aktif. Silakan pilih kebaya, dress sopan, jas, atau sepatu favorit untuk acara Anda.`,
      actionUrl: '/#katalog',
    }),
  ])

  setAuthSession(event, newUser.id)
  setResponseStatus(event, 201)

  return { user: toPublicUser(newUser) }
})
