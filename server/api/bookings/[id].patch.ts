import type {
  BookingRecord,
  BookingStatus,
  GuaranteeStatus,
  GuaranteeType,
  PaymentMethod,
  PaymentStatus,
} from '#shared/types/rental'
import { requireAuthUser } from '../../utils/auth'
import { findBookingById, updateBooking } from '../../utils/db'

export default defineEventHandler(async (event): Promise<BookingRecord> => {
  const user = await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<{
    status?: BookingStatus
    paymentMethod?: PaymentMethod
    paymentStatus?: PaymentStatus
    guaranteeType?: GuaranteeType
    guaranteeNumber?: string
    guaranteeStatus?: GuaranteeStatus
  }>(event)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID transaksi tidak valid.' })
  }

  const booking = await findBookingById(id)
  if (!booking) {
    throw createError({ statusCode: 404, statusMessage: 'Transaksi penyewaan tidak ditemukan.' })
  }

  if (user.role !== 'admin' && booking.userId !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda tidak memiliki izin mengubah transaksi ini.',
    })
  }

  // Update rental status (aktif / selesai / dibatalkan)
  if (body?.status !== undefined) {
    const allowedStatuses: BookingStatus[] = ['aktif', 'selesai', 'dibatalkan']
    if (!allowedStatuses.includes(body.status)) {
      throw createError({ statusCode: 400, statusMessage: 'Status penyewaan tidak valid.' })
    }
    booking.status = body.status
    if (body.status === 'selesai') {
      booking.guaranteeStatus = 'dikembalikan'
      if (booking.deposit > 0 && (!booking.depositStatus || booking.depositStatus === 'ditahan')) {
        booking.depositStatus = 'menunggu_pengembalian'
      }
    }
  }

  // Update payment method
  if (body?.paymentMethod !== undefined) {
    const allowedMethods: PaymentMethod[] = ['cash', 'transfer_bca', 'transfer_mandiri', 'qris', 'gopay']
    if (allowedMethods.includes(body.paymentMethod)) {
      booking.paymentMethod = body.paymentMethod
      if (body.paymentMethod === 'cash' && booking.paymentStatus === 'belum_bayar') {
        booking.paymentStatus = 'bayar_ditempat'
      }
    }
  }

  // Update guarantee type / number (User or Admin)
  if (body?.guaranteeType !== undefined) {
    const allowedGuarantees: GuaranteeType[] = ['ktp', 'sim', 'ktm', 'kk_paspor']
    if (allowedGuarantees.includes(body.guaranteeType)) {
      booking.guaranteeType = body.guaranteeType
    }
  }

  if (typeof body?.guaranteeNumber === 'string') {
    booking.guaranteeNumber = body.guaranteeNumber.trim() || undefined
  }

  // Confirm payment status (Admin only, e.g. confirming Cash received)
  if (body?.paymentStatus !== undefined) {
    if (user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Hanya Admin Butik yang dapat mengubah status pembayaran secara manual.',
      })
    }
    const allowedPayStatuses: PaymentStatus[] = [
      'belum_bayar',
      'bayar_ditempat',
      'terverifikasi',
    ]
    if (!allowedPayStatuses.includes(body.paymentStatus)) {
      throw createError({ statusCode: 400, statusMessage: 'Status pembayaran tidak valid.' })
    }
    booking.paymentStatus = body.paymentStatus
    if (body.paymentStatus === 'terverifikasi') {
      booking.paymentPaidAt = booking.paymentPaidAt || new Date().toISOString()
      if (!booking.paymentReference) {
        const now = new Date()
        const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
        const prefix = booking.paymentMethod === 'cash' ? 'CASH' : 'TRX'
        booking.paymentReference = `${prefix}-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      }
    }
  }

  // Update guarantee handover status (Admin only)
  if (body?.guaranteeStatus !== undefined) {
    if (user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Hanya Admin Butik yang dapat memperbarui status serah-terima jaminan.',
      })
    }
    const allowedGuaranteeStatuses: GuaranteeStatus[] = ['menunggu_serah', 'dititipkan', 'dikembalikan']
    if (!allowedGuaranteeStatuses.includes(body.guaranteeStatus)) {
      throw createError({ statusCode: 400, statusMessage: 'Status jaminan tidak valid.' })
    }
    booking.guaranteeStatus = body.guaranteeStatus
  }

  await updateBooking(booking)
  return booking
})
