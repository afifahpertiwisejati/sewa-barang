import { requireAdminUser } from '../../utils/auth'
import { insertUploadedFile } from '../../utils/db'

const MIME_MAP: Record<string, { ext: string, mime: string }> = {
  'image/jpeg': { ext: 'jpg', mime: 'image/jpeg' },
  'image/jpg': { ext: 'jpg', mime: 'image/jpeg' },
  'image/pjpeg': { ext: 'jpg', mime: 'image/jpeg' },
  'image/jfif': { ext: 'jpg', mime: 'image/jpeg' },
  'image/png': { ext: 'png', mime: 'image/png' },
  'image/webp': { ext: 'webp', mime: 'image/webp' },
  'image/gif': { ext: 'gif', mime: 'image/gif' },
  'image/avif': { ext: 'avif', mime: 'image/avif' },
}

const EXT_MAP: Record<string, { ext: string, mime: string }> = {
  jpg: { ext: 'jpg', mime: 'image/jpeg' },
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  jfif: { ext: 'jpg', mime: 'image/jpeg' },
  png: { ext: 'png', mime: 'image/png' },
  webp: { ext: 'webp', mime: 'image/webp' },
  gif: { ext: 'gif', mime: 'image/gif' },
  avif: { ext: 'avif', mime: 'image/avif' },
}

function detectImageFormat(mime: string | undefined, filename: string | undefined, data: Buffer): { ext: string, mime: string } | null {
  const cleanMime = (mime || '').split(';')[0]?.trim().toLowerCase() || ''
  if (MIME_MAP[cleanMime]) return MIME_MAP[cleanMime]!

  // Magic-bytes detection (handles mobile browsers sending empty/octet-stream MIME)
  if (data.length >= 12) {
    if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) {
      return { ext: 'jpg', mime: 'image/jpeg' }
    }
    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
      return { ext: 'png', mime: 'image/png' }
    }
    if (
      data.subarray(0, 4).toString('ascii') === 'RIFF'
      && data.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return { ext: 'webp', mime: 'image/webp' }
    }
    if (data.subarray(0, 4).toString('ascii') === 'GIF8') {
      return { ext: 'gif', mime: 'image/gif' }
    }
  }

  const extMatch = (filename || '').toLowerCase().match(/\.([a-z0-9]+)$/)
  const fileExt = extMatch?.[1] || ''
  if (EXT_MAP[fileExt]) return EXT_MAP[fileExt]!

  return null
}

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const form = await readMultipartFormData(event)
  const filePart = form?.find(part => part.name === 'file' && part.data?.length)

  if (!filePart) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File foto produk wajib dipilih.',
    })
  }

  const detected = detectImageFormat(filePart.type, filePart.filename, filePart.data)
  if (!detected) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Format foto tidak didukung. Gunakan foto JPG, PNG, WEBP, atau GIF.',
    })
  }

  if (filePart.data.length > MAX_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ukuran foto produk maksimal 10 MB.',
    })
  }

  const fileId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${detected.ext}`
  await insertUploadedFile({
    id: fileId,
    folder: 'items',
    mimeType: detected.mime,
    data: filePart.data,
  })

  setResponseStatus(event, 201)
  return {
    url: `/api/uploads/${fileId}`,
  }
})
