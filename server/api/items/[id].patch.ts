import type { ItemStatus, RentalItem } from '#shared/types/rental'
import { requireAdminUser } from '../../utils/auth'
import { findItemById, updateItem } from '../../utils/db'

export default defineEventHandler(async (event): Promise<RentalItem> => {
  await requireAdminUser(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID produk tidak valid.' })
  }
  const body = await readBody<{
    name?: string
    pricePerDay?: number
    deposit?: number
    location?: string
    status?: ItemStatus
    sizes?: string[]
    imageUrl?: string
  }>(event)

  const item = await findItemById(id)
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Produk tidak ditemukan.' })
  }

  if (typeof body?.name === 'string' && body.name.trim().length >= 4) {
    item.name = body.name.trim()
  }
  if (typeof body?.location === 'string' && body.location.trim().length >= 2) {
    item.location = body.location.trim()
  }
  if (body?.pricePerDay !== undefined && Number.isFinite(Number(body.pricePerDay)) && Number(body.pricePerDay) >= 5000) {
    item.pricePerDay = Math.round(Number(body.pricePerDay))
  }
  if (body?.deposit !== undefined && Number.isFinite(Number(body.deposit)) && Number(body.deposit) >= 0) {
    item.deposit = Math.round(Number(body.deposit))
  }
  if (body?.status === 'Tersedia' || body?.status === 'Sedang Disewa') {
    item.status = body.status
  }
  if (Array.isArray(body?.sizes)) {
    const cleanedSizes = Array.from(
      new Set(
        body.sizes
          .filter((s): s is string => typeof s === 'string')
          .map(s => s.trim())
          .filter(s => s.length > 0 && s.length <= 24),
      ),
    )
    if (cleanedSizes.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Pilih minimal 1 ukuran untuk produk ini.' })
    }
    item.sizes = cleanedSizes
  }
  if (typeof body?.imageUrl === 'string' && /^(https?:\/\/|\/images\/|\/uploads\/|\/api\/uploads\/).+/i.test(body.imageUrl.trim())) {
    const newUrl = body.imageUrl.trim()
    item.imageUrl = newUrl
    item.gallery = Array.from(new Set([newUrl, ...item.gallery.filter(u => u !== newUrl)]))
  }

  await updateItem(item)
  return item
})
