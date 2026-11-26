import {
  DRY_CLEAN_BUFFER_AFTER_DAYS,
  DRY_CLEAN_BUFFER_BEFORE_DAYS,
  shiftIsoDate,
  type ItemsListResponse,
  type SortOption,
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

  const hasDateRange = Boolean(startDate && endDate && endDate >= startDate)

  if (hasDateRange) {
    // Scheduled rental availability: an item currently rented today is STILL bookable for future dates!
    // Check if at least one (color x size) slot is free during [startDate, endDate] (respecting dry-clean buffer).
    filtered = filtered.filter((item) => {
      const itemBookings = activeBookings.filter(b => b.itemId === item.id && b.status === 'aktif')
      if (itemBookings.length === 0) return true

      const hasMultiColor = Boolean(item.colors && item.colors.length > 1)
      const variants = hasMultiColor && item.colors
        ? item.colors.map(c => ({
            color: c.name,
            sizes: Array.isArray(c.sizes) ? c.sizes : (item.sizes.length ? item.sizes : ['All Size']),
          }))
        : [{ color: '', sizes: item.sizes.length ? item.sizes : ['All Size'] }]

      return variants.some(v =>
        v.sizes.some((size) => {
          const slotBlocked = itemBookings.some((b) => {
            const bufferStart = shiftIsoDate(b.startDate, -DRY_CLEAN_BUFFER_BEFORE_DAYS)
            const bufferEnd = shiftIsoDate(b.endDate, DRY_CLEAN_BUFFER_AFTER_DAYS)
            if (!datesOverlap(startDate, endDate, bufferStart, bufferEnd)) return false

            const sameSize = b.selectedSize.trim().toLowerCase() === size.trim().toLowerCase()
            if (!sameSize) return false

            if (hasMultiColor && v.color && b.selectedColor) {
              return b.selectedColor.trim().toLowerCase() === v.color.trim().toLowerCase()
            }
            return true
          })
          return !slotBlocked
        }),
      )
    })
  }
  else if (availableOnly) {
    // Fallback only if user filtered without specifying a date range
    filtered = filtered.filter(item => item.status === 'Tersedia')
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
