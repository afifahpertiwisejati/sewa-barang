import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { requireAuthUser } from '../../utils/auth'

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)

  const form = await readMultipartFormData(event)
  const filePart = form?.find(part => part.name === 'file' && part.data?.length)

  if (!filePart) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File bukti pembayaran wajib dipilih.',
    })
  }

  const mime = (filePart.type || '').toLowerCase()
  const ext = ALLOWED_TYPES[mime]
  if (!ext) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Format file harus JPG, PNG, atau WEBP.',
    })
  }

  if (filePart.data.length > MAX_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ukuran file bukti pembayaran maksimal 5 MB.',
    })
  }

  const uploadDir = resolve(process.cwd(), 'public', 'uploads', 'proofs')
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true })
  }

  const filename = `proof-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
  writeFileSync(resolve(uploadDir, filename), filePart.data)

  setResponseStatus(event, 201)
  return {
    url: `/uploads/proofs/${filename}`,
  }
})
