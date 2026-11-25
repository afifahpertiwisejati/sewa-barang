import { requireAdminUser } from '../../utils/auth'
import { deleteItemById } from '../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID produk tidak valid.' })
  }

  const deleted = await deleteItemById(id)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Produk tidak ditemukan.' })
  }

  return { ok: true, id }
})
