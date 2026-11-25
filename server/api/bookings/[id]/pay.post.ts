import { PAYMENT_ACCOUNTS, type BookingRecord, type PaymentMethod } from '#shared/types/rental'
import { requireAuthUser } from '../../../utils/auth'
import { createNotification, findBookingById, updateBooking } from '../../../utils/db'

function generatePaymentRef(prefix: string): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${y}${m}${d}-${rand}`
}

export default defineEventHandler(async (event): Promise<BookingRecord> => {
  const user = await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ paymentMethod?: PaymentMethod, paymentChannel?: string }>(event).catch(
    () => ({} as { paymentMethod?: PaymentMethod, paymentChannel?: string }),
  )

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
      statusMessage: 'Anda tidak memiliki izin membayar transaksi ini.',
    })
  }

  if (booking.status !== 'aktif' && booking.status !== 'menunggu_konfirmasi') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Hanya transaksi aktif atau menunggu konfirmasi yang dapat dibayar.',
    })
  }

  const allowedMethods: PaymentMethod[] = ['cash', 'transfer_bca', 'transfer_mandiri', 'qris', 'gopay']
  if (body?.paymentMethod && allowedMethods.includes(body.paymentMethod)) {
    booking.paymentMethod = body.paymentMethod
  }

  if (typeof body?.paymentChannel === 'string' && body.paymentChannel.trim()) {
    booking.paymentChannel = body.paymentChannel.trim().slice(0, 40)
  }

  if (booking.paymentMethod === 'cash') {
    if (user.role === 'admin') {
      booking.paymentStatus = 'terverifikasi'
      booking.paymentReference = booking.paymentReference || generatePaymentRef('CASH')
      booking.paymentPaidAt = new Date().toISOString()
    }
    else {
      booking.paymentStatus = 'bayar_ditempat'
    }
  }
  else {
    booking.paymentStatus = 'terverifikasi'
    booking.paymentReference = booking.paymentReference || generatePaymentRef('TRX')
    booking.paymentPaidAt = new Date().toISOString()
  }

  await updateBooking(booking)

  const methodLabel = PAYMENT_ACCOUNTS[booking.paymentMethod]?.label || booking.paymentMethod
  const notifTasks: Promise<unknown>[] = []

  if (booking.paymentStatus === 'terverifikasi') {
    if (user.role === 'admin') {
      if (booking.userId) {
        notifTasks.push(
          createNotification({
            userId: booking.userId,
            recipientRole: 'user',
            type: 'payment_confirmed',
            title: 'Pembayaran Dikonfirmasi Admin',
            message: `Pembayaran ${methodLabel} untuk ${booking.itemName} (${booking.id}) telah terverifikasi. Ref: ${booking.paymentReference}.`,
            bookingId: booking.id,
            actionUrl: '/dashboard',
          }),
        )
      }
    }
    else {
      notifTasks.push(
        createNotification({
          recipientRole: 'admin',
          type: 'payment_confirmed',
          title: 'Pembayaran Penyewa Terverifikasi',
          message: `${booking.renterName} telah membayar ${booking.itemName} (${booking.id}) sebesar Rp${booking.totalPrice.toLocaleString('id-ID')} via ${methodLabel}.`,
          bookingId: booking.id,
          actionUrl: '/admin',
        }),
      )
      if (booking.userId) {
        notifTasks.push(
          createNotification({
            userId: booking.userId,
            recipientRole: 'user',
            type: 'payment_confirmed',
            title: 'Pembayaran Berhasil Terverifikasi',
            message: `Pembayaran ${booking.itemName} (${booking.id}) via ${methodLabel} berhasil. Ref: ${booking.paymentReference}.`,
            bookingId: booking.id,
            actionUrl: '/dashboard',
          }),
        )
      }
    }
  }
  else if (booking.paymentStatus === 'bayar_ditempat' && user.role !== 'admin') {
    notifTasks.push(
      createNotification({
        recipientRole: 'admin',
        type: 'payment_confirmed',
        title: 'Metode Bayar Di Tempat Dipilih',
        message: `${booking.renterName} memilih bayar tunai di tempat untuk ${booking.itemName} (${booking.id}).`,
        bookingId: booking.id,
        actionUrl: '/admin',
      }),
    )
  }

  if (notifTasks.length > 0) {
    await Promise.allSettled(notifTasks)
  }

  return booking
})
