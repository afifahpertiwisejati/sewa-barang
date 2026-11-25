import {
  DEPOSIT_REFUND_METHODS,
  type BookingRecord,
  type DepositRefundMethod,
} from '#shared/types/rental'
import { requireAuthUser } from '../../../utils/auth'
import { createNotification, findBookingById, updateBooking } from '../../../utils/db'

function generateRefundRef(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `RFND-${y}${m}${d}-${rand}`
}

export default defineEventHandler(async (event): Promise<BookingRecord> => {
  const user = await requireAuthUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody<{
    action?: 'request' | 'process'
    depositRefundMethod?: DepositRefundMethod
    depositRefundAccount?: string
    depositDeduction?: number
    depositRefundNote?: string
    completeRental?: boolean
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
      statusMessage: 'Anda tidak memiliki izin mengakses pengembalian deposit transaksi ini.',
    })
  }

  if (booking.status === 'dibatalkan') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Transaksi yang dibatalkan tidak dapat diproses pengembalian depositnya.',
    })
  }

  if (booking.deposit <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Transaksi ini tidak memiliki nominal deposit.',
    })
  }

  const action = body?.action === 'process' ? 'process' : 'request'
  const allowedMethods = Object.keys(DEPOSIT_REFUND_METHODS) as DepositRefundMethod[]
  const method = body?.depositRefundMethod && allowedMethods.includes(body.depositRefundMethod)
    ? body.depositRefundMethod
    : (booking.depositRefundMethod || 'transfer_bca')
  const isCash = method === 'cash'
  const account = typeof body?.depositRefundAccount === 'string'
    ? body.depositRefundAccount.trim()
    : (booking.depositRefundAccount || '')
  const note = typeof body?.depositRefundNote === 'string'
    ? body.depositRefundNote.trim()
    : undefined

  if (action === 'request') {
    if (booking.depositStatus === 'dikembalikan' || booking.depositStatus === 'dipotong') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Deposit untuk transaksi ini sudah selesai dikembalikan.',
      })
    }

    if (!isCash && account.length < 5) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Mohon isi nomor rekening / e-wallet beserta nama pemilik rekening tujuan pengembalian.',
      })
    }

    booking.depositStatus = 'menunggu_pengembalian'
    booking.depositRefundMethod = method
    booking.depositRefundAccount = isCash ? 'Ambil Tunai di Butik SewaIn+' : account
    if (note) {
      booking.depositRefundNote = note
    }

    await updateBooking(booking)

    const methodLabel = DEPOSIT_REFUND_METHODS[method]?.label || method
    await createNotification({
      recipientRole: 'admin',
      type: 'deposit_requested',
      title: 'Pengajuan Pengembalian Deposit',
      message: `${booking.renterName} mengajukan pencairan deposit Rp${booking.deposit.toLocaleString('id-ID')} untuk ${booking.itemName} (${booking.id}) via ${methodLabel}.`,
      bookingId: booking.id,
      actionUrl: '/admin',
    }).catch(() => {})

    return booking
  }

  // Action: 'process' (Admin only — disburse deposit refund)
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Hanya Admin Butik yang dapat mencairkan dan mengonfirmasi pengembalian deposit.',
    })
  }

  if (!isCash && account.length < 5) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nomor rekening / e-wallet tujuan pengembalian wajib diisi untuk transfer non-tunai.',
    })
  }

  const rawDeduction = Number(body?.depositDeduction ?? 0)
  if (!Number.isFinite(rawDeduction) || rawDeduction < 0 || rawDeduction > booking.deposit) {
    throw createError({
      statusCode: 400,
      statusMessage: `Nominal potongan harus antara Rp0 hingga ${booking.deposit}.`,
    })
  }

  const deduction = Math.round(rawDeduction)
  const refundAmount = Math.max(0, booking.deposit - deduction)

  booking.depositDeduction = deduction
  booking.depositRefundAmount = refundAmount
  booking.depositRefundMethod = method
  booking.depositRefundAccount = isCash ? 'Tunai di Butik SewaIn+' : account
  booking.depositStatus = deduction > 0 ? 'dipotong' : 'dikembalikan'
  booking.depositRefundReference = booking.depositRefundReference || generateRefundRef()
  booking.depositRefundedAt = new Date().toISOString()
  booking.depositRefundNote = note
    || (deduction > 0
      ? `Deposit dikembalikan setelah potongan sebesar Rp${deduction.toLocaleString('id-ID')}.`
      : 'Busana kembali dalam kondisi bersih & utuh. Deposit dikembalikan 100%.')

  if (body?.completeRental !== false && booking.status === 'aktif') {
    booking.status = 'selesai'
    booking.guaranteeStatus = 'dikembalikan'
  }

  await updateBooking(booking)

  if (booking.userId) {
    const methodLabel = DEPOSIT_REFUND_METHODS[method]?.label || method
    await createNotification({
      userId: booking.userId,
      recipientRole: 'user',
      type: 'deposit_refunded',
      title: deduction > 0 ? 'Deposit Dikembalikan (Dengan Potongan)' : 'Deposit Telah Dikembalikan 100%',
      message: deduction > 0
        ? `Deposit Rp${refundAmount.toLocaleString('id-ID')} (potongan Rp${deduction.toLocaleString('id-ID')}) untuk ${booking.itemName} (${booking.id}) telah dicairkan via ${methodLabel}. Ref: ${booking.depositRefundReference}.`
        : `Deposit Rp${refundAmount.toLocaleString('id-ID')} untuk ${booking.itemName} (${booking.id}) telah dicairkan penuh via ${methodLabel}. Ref: ${booking.depositRefundReference}.`,
      bookingId: booking.id,
      actionUrl: '/dashboard',
    }).catch(() => {})
  }

  return booking
})
