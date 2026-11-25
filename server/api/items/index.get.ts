import type {
  ItemsListResponse,
  SortOption,
} from '#shared/types/rental'
import { listActiveBookings, listAllItems, syncAllItemStatusesInDb } from '../../utils/db'
import { datesOverlap } from '../../utils/store'

export default defineEventHandler(async (event): Promise<ItemsListResponse> => {
  await syncAllItemStatusesInDb()
  const [items, activeBookings] = await Promise.all([
    listAllItems(),
    listActiveBookings(),
  ])

  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''
  const category = typeof query.category === 'string' ? query.category.trim() : ''
  const location = typeof query.location === 'string' ? query.location.trim().toLowerCase() : ''
  const maxPriceRaw = query.maxPrice ? Number(query.maxPrice) : null
  const maxPrice = maxPriceRaw && Number.isFinite(maxPriceRaw) && maxPriceRaw > 0 ? maxPriceRaw : null
  const availableOnly = query.availableOnly === 'true'
  const startDate = typeof query.startDate === 'string' ? query.startDate.trim() : ''
  const endDate = typeof query.endDate === 'string' ? query.endDate.trim() : ''
  const sort = (typeof query.sort === 'string' ? query.sort : 'newest') as SortOption

  const availableCities = Array.from(new Set(items.map(item => item.location))).sort((a, b) =>
    a.localeCompare(b, 'id'),
  )
  const maxCatalogPrice = items.reduce((max, item) => Math.max(max, item.pricePerDay), 500000)

  let filtered = [...items]

  if (q) {
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(q)
      || item.description.toLowerCase().includes(q)
      || item.category.toLowerCase().includes(q)
      || item.location.toLowerCase().includes(q),
    )
  }

  if (category && category !== 'Semua') {
    filtered = filtered.filter(item => item.category === category)
  }

  if (location && location !== 'semua' && location !== 'semua kota') {
    filtered = filtered.filter(item => item.location.toLowerCase().includes(location))
  }

  if (maxPrice !== null) {
    filtered = filtered.filter(item => item.pricePerDay <= maxPrice)
  }

  if (availableOnly) {
    filtered = filtered.filter(item => item.status === 'Tersedia')
  }

  if (startDate && endDate && endDate >= startDate) {
    filtered = filtered.filter((item) => {
      const hasConflict = activeBookings.some(
        b =>
          b.itemId === item.id
          && (b.status === 'aktif' || b.status === 'menunggu_konfirmasi')
          && datesOverlap(startDate, endDate, b.startDate, b.endDate),
      )
      return !hasConflict
    })
  }

  switch (sort) {
    case 'price_asc':
      filtered.sort((a, b) => a.pricePerDay - b.pricePerDay)
      break
    case 'rating_desc':
      filtered.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
      break
    case 'newest':
    default:
      filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      break
  }

  return {
    items: filtered,
    total: filtered.length,
    availableCities,
    maxCatalogPrice,
  }
})
