import { requireAuthUser } from '../../utils/auth'
import { insertUploadedFile } from '../../utils/db'

const MIME_MAP: Record<string, { ext: string, mime: string }> = {
  'image/jpeg': { ext: 'jpg', mime: 'image/jpeg' },
  'image/jpg': { ext: 'jpg', mime: 'image/jpeg' },
  'image/pjpeg': { ext: 'jpg', mime: 'image/jpeg' },
  'image/jfif': { ext: 'jpg', mime: 'image/jpeg' },
  'image/png': { ext: 'png', mime: 'image/png' },
  'image/webp': { ext: 'webp', mime: 'image/webp' },
  'image/gif': { ext: 'gif', mime: 'image/gif' },
}

function detectImageFormat(mime: string | undefined, filename: string | undefined, data: Buffer): { ext: string, mime: string } | null {
  const cleanMime = (mime || '').split(';')[0]?.trim().toLowerCase() || ''
  if (MIME_MAP[cleanMime]) return MIME_MAP[cleanMime]!

  if (data.length >= 12) {
    if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) return { ext: 'jpg', mime: 'image/jpeg' }
    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) return { ext: 'png', mime: 'image/png' }
    if (data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') {
      return { ext: 'webp', mime: 'image/webp' }
    }
  }

  const extMatch = (filename || '').toLowerCase().match(/\.([a-z0-9]+)$/)
  const fileExt = extMatch?.[1] || ''
  if (fileExt === 'jpg' || fileExt === 'jpeg' || fileExt === 'jfif') return { ext: 'jpg', mime: 'image/jpeg' }
  if (fileExt === 'png') return { ext: 'png', mime: 'image/png' }
  if (fileExt === 'webp') return { ext: 'webp', mime: 'image/webp' }
  return null
}

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

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

  const detected = detectImageFormat(filePart.type, filePart.filename, filePart.data)
  if (!detected) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Format file harus JPG, PNG, atau WEBP.',
    })
  }

  if (filePart.data.length > MAX_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ukuran file bukti pembayaran maksimal 10 MB.',
    })
  }

  const fileId = `proof-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${detected.ext}`
  await insertUploadedFile({
    id: fileId,
    folder: 'proofs',
    mimeType: detected.mime,
    data: filePart.data,
  })

  setResponseStatus(event, 201)
  return {
    url: `/api/uploads/${fileId}`,
  }
})
