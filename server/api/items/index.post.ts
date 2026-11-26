import {
  CATEGORY_MATERIAL_SPECS,
  RENTAL_CATEGORIES,
  type CreateItemPayload,
  type RentalCategory,
  type RentalItem,
} from '#shared/types/rental'
import { requireAdminUser } from '../../utils/auth'
import { insertItem } from '../../utils/db'

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'SW'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
}

export default defineEventHandler(async (event): Promise<RentalItem> => {
  const admin = await requireAdminUser(event)
  const body = await readBody<Partial<CreateItemPayload>>(event)

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const category = body?.category as RentalCategory
  const location = typeof body?.location === 'string' ? body.location.trim() : ''
  const pricePerDay = Number(body?.pricePerDay)
  const deposit = Number(body?.deposit)
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const imageUrl = typeof body?.imageUrl === 'string' ? body.imageUrl.trim() : ''
  const ownerName = typeof body?.ownerName === 'string' && body.ownerName.trim()
    ? body.ownerName.trim()
    : admin.name
  const sizes = Array.isArray(body?.sizes) && body.sizes.length > 0
    ? body.sizes.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim())
    : ['S', 'M', 'L']

  if (!name || name.length < 4) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nama busana minimal 4 karakter.',
    })
  }

  if (!RENTAL_CATEGORIES.includes(category)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Kategori busana tidak valid.',
    })
  }

  if (!location || location.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Lokasi kota wajib diisi.',
    })
  }

  if (!Number.isFinite(pricePerDay) || pricePerDay < 5000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Harga sewa per hari minimal Rp5.000.',
    })
  }

  if (!Number.isFinite(deposit) || deposit < 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nilai deposit tidak valid.',
    })
  }

  if (!description || description.length < 15) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Deskripsi busana minimal 15 karakter.',
    })
  }

  const isValidImageUrl = (u: string) => /^(https?:\/\/|\/images\/|\/uploads\/|\/api\/uploads\/).+/i.test(u)

  if (!imageUrl || !isValidImageUrl(imageUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Foto produk wajib diunggah atau menggunakan URL gambar yang valid.',
    })
  }

  const extraGallery = Array.isArray(body?.gallery)
    ? body.gallery
        .filter((u): u is string => typeof u === 'string' && isValidImageUrl(u.trim()))
        .map(u => u.trim())
    : []
  const gallery = Array.from(new Set([imageUrl, ...extraGallery]))

  const uniqueSuffix = Date.now().toString(36).slice(-4)
  const id = `${toSlug(name) || 'busana'}-${uniqueSuffix}`

  const specs = Array.isArray(body?.specs) && body.specs.length > 0
    ? body.specs
        .filter(s => s?.label?.trim() && s?.value?.trim())
        .map(s => ({ label: s.label.trim(), value: s.value.trim() }))
    : [
        { label: 'Bahan & Detail', value: CATEGORY_MATERIAL_SPECS[category] },
        { label: 'Ukuran Tersedia', value: sizes.join(', ') },
        { label: 'Lokasi', value: location },
        { label: 'Perawatan', value: 'Gratis Dry-Clean Profesional' },
      ]

  const newItem: RentalItem = {
    id,
    name,
    category,
    location,
    pricePerDay: Math.round(pricePerDay),
    deposit: Math.round(deposit),
    rating: 5.0,
    reviewCount: 1,
    status: 'Tersedia',
    sizes,
    imageUrl,
    gallery,
    description,
    specs,
    owner: {
      name: ownerName,
      city: location,
      verified: true,
      joinedYear: 2026,
      responseRate: 100,
      totalRentals: 1,
      avatarInitials: getInitials(ownerName),
    },
    createdAt: new Date().toISOString(),
  }

  await insertItem(newItem)

  setResponseStatus(event, 201)
  return newItem
})
