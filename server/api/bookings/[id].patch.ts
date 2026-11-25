import type {
  BookingRecord,
  BookingStatus,
  GuaranteeStatus,
  GuaranteeType,
  HandoverStatus,
  PaymentMethod,
  PaymentStatus,
} from '#shared/types/rental'
import { requireAuthUser } from '../../utils/auth'
import { createNotification, findBookingById, updateBooking } from '../../utils/db'

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
    handoverStatus?: HandoverStatus
    handoverRecipient?: string
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

  const prevStatus = booking.status
  const prevPaymentStatus = booking.paymentStatus
  const prevGuaranteeStatus = booking.guaranteeStatus
  const prevHandoverStatus = booking.handoverStatus || 'belum_diterima'

  // Update rental status (aktif / selesai / dibatalkan)
  if (body?.status !== undefined) {
    const allowedStatuses: BookingStatus[] = ['aktif', 'selesai', 'dibatalkan']
    if (!allowedStatuses.includes(body.status)) {
      throw createError({ statusCode: 400, statusMessage: 'Status penyewaan tidak valid.' })
    }
    if (body.status === 'selesai' && user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Hanya Admin Butik yang dapat menyelesaikan penyewaan.',
      })
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

  // Confirm recipient / handover of rented item (Admin only)
  if (body?.handoverStatus !== undefined) {
    if (user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Hanya Admin Butik yang dapat mengonfirmasi penerima busana.',
      })
    }
    const allowedHandover: HandoverStatus[] = ['belum_diterima', 'diterima']
    if (!allowedHandover.includes(body.handoverStatus)) {
      throw createError({ statusCode: 400, statusMessage: 'Status penerimaan tidak valid.' })
    }
    booking.handoverStatus = body.handoverStatus
    if (body.handoverStatus === 'diterima') {
      const recipient = typeof body.handoverRecipient === 'string' && body.handoverRecipient.trim()
        ? body.handoverRecipient.trim().slice(0, 150)
        : booking.renterName
      booking.handoverRecipient = recipient
      booking.handoverConfirmedAt = new Date().toISOString()
    }
    else {
      booking.handoverRecipient = undefined
      booking.handoverConfirmedAt = undefined
    }
  }

  await updateBooking(booking)

  const notifTasks: Promise<unknown>[] = []

  // Status transitions
  if (booking.status !== prevStatus) {
    if (booking.status === 'selesai') {
      if (user.role === 'admin' && booking.userId) {
        notifTasks.push(
          createNotification({
            userId: booking.userId,
            recipientRole: 'user',
            type: 'booking_completed',
            title: 'Penyewaan Selesai',
            message: booking.deposit > 0 && booking.depositStatus !== 'dikembalikan'
              ? `Sewa ${booking.itemName} (${booking.id}) telah diselesaikan oleh Admin. Anda dapat mengajukan pengembalian deposit Rp${booking.deposit.toLocaleString('id-ID')}.`
              : `Sewa ${booking.itemName} (${booking.id}) telah selesai. Terima kasih telah menyewa di Seruni Atelier!`,
            bookingId: booking.id,
            actionUrl: '/dashboard',
          }),
        )
      }
      else if (user.role !== 'admin') {
        notifTasks.push(
          createNotification({
            recipientRole: 'admin',
            type: 'booking_completed',
            title: 'Penyewa Menandai Sewa Selesai',
            message: `${booking.renterName} menandai penyewaan ${booking.itemName} (${booking.id}) selesai. Cek kondisi busana & proses pengembalian deposit.`,
            bookingId: booking.id,
            actionUrl: '/admin',
          }),
        )
      }
    }
    else if (booking.status === 'dibatalkan') {
      if (user.role === 'admin' && booking.userId) {
        notifTasks.push(
          createNotification({
            userId: booking.userId,
            recipientRole: 'user',
            type: 'booking_cancelled',
            title: 'Pesanan Dibatalkan Admin',
            message: `Pesanan ${booking.itemName} (${booking.id}) telah dibatalkan oleh Admin Butik.`,
            bookingId: booking.id,
            actionUrl: '/dashboard',
          }),
        )
      }
      else if (user.role !== 'admin') {
        notifTasks.push(
          createNotification({
            recipientRole: 'admin',
            type: 'booking_cancelled',
            title: 'Pesanan Dibatalkan Penyewa',
            message: `${booking.renterName} membatalkan pesanan ${booking.itemName} (${booking.id}).`,
            bookingId: booking.id,
            actionUrl: '/admin',
          }),
        )
      }
    }
  }

  // Admin manually verified payment (e.g. cash received)
  if (booking.paymentStatus !== prevPaymentStatus && booking.paymentStatus === 'terverifikasi' && booking.userId) {
    notifTasks.push(
      createNotification({
        userId: booking.userId,
        recipientRole: 'user',
        type: 'payment_confirmed',
        title: 'Pembayaran Diterima & Terverifikasi',
        message: `Admin Butik mengonfirmasi pembayaran untuk ${booking.itemName} (${booking.id}). Ref: ${booking.paymentReference || '-'}.`,
        bookingId: booking.id,
        actionUrl: '/dashboard',
      }),
    )
  }

  // Admin updated guarantee handover status
  if (booking.guaranteeStatus !== prevGuaranteeStatus && booking.userId && booking.status !== 'selesai') {
    const labelMap: Record<GuaranteeStatus, { title: string, desc: string }> = {
      dititipkan: {
        title: 'Jaminan Identitas Diterima',
        desc: `Admin Butik telah menerima titipan jaminan identitas untuk pesanan ${booking.itemName} (${booking.id}).`,
      },
      dikembalikan: {
        title: 'Jaminan Identitas Dikembalikan',
        desc: `Jaminan identitas Anda untuk pesanan ${booking.itemName} (${booking.id}) telah dikembalikan.`,
      },
      menunggu_serah: {
        title: 'Status Jaminan Diperbarui',
        desc: `Status jaminan identitas untuk pesanan ${booking.itemName} (${booking.id}) menunggu penyerahan.`,
      },
    }
    const info = labelMap[booking.guaranteeStatus]
    notifTasks.push(
      createNotification({
        userId: booking.userId,
        recipientRole: 'user',
        type: 'guarantee_updated',
        title: info.title,
        message: info.desc,
        bookingId: booking.id,
        actionUrl: '/dashboard',
      }),
    )
  }

  // Admin confirmed handover recipient
  if ((booking.handoverStatus || 'belum_diterima') !== prevHandoverStatus && booking.handoverStatus === 'diterima' && booking.userId) {
    notifTasks.push(
      createNotification({
        userId: booking.userId,
        recipientRole: 'user',
        type: 'system',
        title: 'Penerimaan Busana Dikonfirmasi',
        message: `Admin Butik mencatat busana ${booking.itemName} (${booking.id}) telah diterima oleh ${booking.handoverRecipient || booking.renterName}.`,
        bookingId: booking.id,
        actionUrl: '/dashboard',
      }),
    )
  }

  if (notifTasks.length > 0) {
    await Promise.allSettled(notifTasks)
  }

  return booking
})
