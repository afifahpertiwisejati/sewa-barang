import type { BookingRecord } from '#shared/types/rental'
import { getAuthUser } from '../../utils/auth'
import { listAllBookings, listBookingsByUserId } from '../../utils/db'

export default defineEventHandler(async (event): Promise<BookingRecord[]> => {
  const user = await getAuthUser(event)
  if (!user) return []

  if (user.role === 'admin') {
    return await listAllBookings()
  }

  return await listBookingsByUserId(user.id)
})
