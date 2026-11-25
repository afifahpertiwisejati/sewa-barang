import { requireAdminUser } from '../../utils/auth'
import { insertUploadedFile } from '../../utils/db'

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
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

  const mime = (filePart.type || '').toLowerCase()
  const ext = ALLOWED_TYPES[mime]
  if (!ext) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Format foto harus JPG, PNG, atau WEBP.',
    })
  }

  if (filePart.data.length > MAX_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ukuran foto produk maksimal 10 MB.',
    })
  }

  const fileId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
  await insertUploadedFile({
    id: fileId,
    folder: 'items',
    mimeType: mime === 'image/jpg' ? 'image/jpeg' : mime,
    data: filePart.data,
  })

  setResponseStatus(event, 201)
  return {
    url: `/api/uploads/${fileId}`,
  }
})
