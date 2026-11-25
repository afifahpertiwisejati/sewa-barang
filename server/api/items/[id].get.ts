import type { RentalItemDetail } from '#shared/types/rental'
import { findItemById, listActiveBookingsByItemId, syncItemStatusInDb } from '../../utils/db'

export default defineEventHandler(async (event): Promise<RentalItemDetail> => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID barang tidak valid.',
    })
  }

  const item = await findItemById(id)
  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Barang tidak ditemukan.',
    })
  }

  item.status = await syncItemStatusInDb(item.id)
  const activeBookings = await listActiveBookingsByItemId(item.id)

  const bookedRanges = activeBookings
    .map(b => ({
      bookingId: b.id,
      startDate: b.startDate,
      endDate: b.endDate,
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  return {
    ...item,
    bookedRanges,
  }
})
