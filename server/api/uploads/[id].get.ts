import { findUploadedFileById } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = (getRouterParam(event, 'id') || '').trim()
  if (!id || !/^[a-zA-Z0-9._-]+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'ID file tidak valid.' })
  }

  const file = await findUploadedFileById(id)
  if (!file) {
    throw createError({ statusCode: 404, statusMessage: 'Foto tidak ditemukan.' })
  }

  setHeader(event, 'Content-Type', file.mimeType)
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return file.data
})
