import {
  calculatePackagePricing,
  DELIVERY_FEE_COURIER,
  DEPOSIT_REFUND_METHODS,
  DRY_CLEAN_BUFFER_AFTER_DAYS,
  DRY_CLEAN_BUFFER_BEFORE_DAYS,
  shiftIsoDate,
  type BookingRecord,
  type CreateBookingPayload,
  type DeliveryOption,
  type DepositRefundMethod,
  type GuaranteeType,
  type PaymentMethod,
  type PaymentStatus,
} from '#shared/types/rental'
import { requireAuthUser } from '../../utils/auth'
import {
  countAllBookings,
  createNotification,
  findItemById,
  insertBooking,
  listActiveBookingsByItemId,
} from '../../utils/db'
import {
  calculateRentalDays,
  datesOverlap,
} from '../../utils/store'

function isValidIsoDate(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(val) && !Number.isNaN(new Date(`${val}T00:00:00`).getTime())
}

function getTodayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default defineEventHandler(async (event): Promise<BookingRecord> => {
  const user = await requireAuthUser(event)
  const body = await readBody<Partial<CreateBookingPayload>>(event)

  const itemId = typeof body?.itemId === 'string' ? body.itemId.trim() : ''
  const startDate = typeof body?.startDate === 'string' ? body.startDate.trim() : ''
  const endDate = typeof body?.endDate === 'string' ? body.endDate.trim() : ''
  const deliveryOption: DeliveryOption
    = body?.deliveryOption === 'kurir_antar' ? 'kurir_antar' : 'ambil_sendiri'
  const allowedMethods: PaymentMethod[] = ['cash', 'transfer_bca', 'transfer_mandiri', 'qris', 'gopay']
  const paymentMethod: PaymentMethod
    = body?.paymentMethod && allowedMethods.includes(body.paymentMethod)
      ? body.paymentMethod
      : 'transfer_bca'
  const allowedGuarantees: GuaranteeType[] = ['ktp', 'sim', 'ktm', 'kk_paspor']
  const guaranteeType: GuaranteeType
    = body?.guaranteeType && allowedGuarantees.includes(body.guaranteeType)
      ? body.guaranteeType
      : 'ktp'
  const guaranteeNumber = typeof body?.guaranteeNumber === 'string' ? body.guaranteeNumber.trim() : ''
  const allowedRefundMethods = Object.keys(DEPOSIT_REFUND_METHODS) as DepositRefundMethod[]
  const depositRefundMethod: DepositRefundMethod | undefined
    = body?.depositRefundMethod && allowedRefundMethods.includes(body.depositRefundMethod)
      ? body.depositRefundMethod
      : undefined
  const rawRefundAccount = typeof body?.depositRefundAccount === 'string' ? body.depositRefundAccount.trim() : ''
  const depositRefundAccount = depositRefundMethod === 'cash'
    ? 'Tunai di Butik Seruni Atelier'
    : (rawRefundAccount || undefined)
  const renterName = typeof body?.renterName === 'string' ? body.renterName.trim() : ''
  const renterPhone = typeof body?.renterPhone === 'string' ? body.renterPhone.trim() : ''
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : undefined

  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'ID busana wajib diisi.' })
  }

  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Format tanggal mulai dan selesai tidak valid.',
    })
  }

  const today = getTodayIso()
  if (startDate < today) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tanggal mulai sewa tidak boleh di masa lalu.',
    })
  }

  if (endDate < startDate) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tanggal selesai harus sama dengan atau setelah tanggal mulai.',
    })
  }

  if (!renterName || renterName.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nama penyewa wajib diisi.',
    })
  }

  if (!renterPhone || renterPhone.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nomor WhatsApp/HP yang valid wajib diisi.',
    })
  }

  if (body?.agreedToTerms !== true) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Anda wajib mencentang persetujuan Syarat & Ketentuan (denda keterlambatan & ketentuan kerusakan/noda permanen) sebelum menyewa.',
    })
  }

  const item = await findItemById(itemId)
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Busana tidak ditemukan.' })
  }

  if (item.deposit > 0 && depositRefundMethod && depositRefundMethod !== 'cash' && (!depositRefundAccount || depositRefundAccount.length < 5)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Mohon isi nomor rekening / e-wallet dan nama pemilik untuk pengembalian deposit.',
    })
  }

  const matchedColor = typeof body?.selectedColor === 'string' && body.selectedColor.trim()
    ? item.colors?.find(c => c.name.toLowerCase() === body.selectedColor!.trim().toLowerCase())
    : item.colors?.[0]
  const selectedColor = matchedColor?.name
    || (typeof body?.selectedColor === 'string' && body.selectedColor.trim() ? body.selectedColor.trim() : undefined)
  const variantSizes = matchedColor?.sizes?.length ? matchedColor.sizes : item.sizes
  const selectedSize = typeof body?.selectedSize === 'string' && body.selectedSize.trim()
    ? body.selectedSize.trim()
    : (variantSizes[0] ?? 'All Size')
  const bookingImageUrl = matchedColor?.imageUrl || item.imageUrl

  if (variantSizes.length > 0 && !variantSizes.includes(selectedSize)) {
    throw createError({
      statusCode: 400,
      statusMessage: selectedColor
        ? `Ukuran ${selectedSize} sedang tidak tersedia untuk warna ${selectedColor}. Silakan pilih ukuran lain.`
        : `Ukuran ${selectedSize} sedang tidak tersedia untuk busana ini.`,
    })
  }

  const activeBookings = await listActiveBookingsByItemId(item.id)
  const hasMultipleColors = Boolean(item.colors && item.colors.length > 1)
  const sameVariantBookings = activeBookings.filter((b) => {
    const sameSize = b.selectedSize.trim().toLowerCase() === selectedSize.trim().toLowerCase()
    if (!sameSize) return false
    if (hasMultipleColors && selectedColor && b.selectedColor) {
      return b.selectedColor.trim().toLowerCase() === selectedColor.trim().toLowerCase()
    }
    return true
  })

  const directConflict = sameVariantBookings.find(
    b => datesOverlap(startDate, endDate, b.startDate, b.endDate),
  )

  if (directConflict) {
    const variantLabel = selectedColor
      ? `Ukuran ${selectedSize} warna ${selectedColor}`
      : `Ukuran ${selectedSize}`
    throw createError({
      statusCode: 409,
      statusMessage: `${variantLabel} sudah terpesan pada ${directConflict.startDate} s/d ${directConflict.endDate}. Silakan pilih ukuran, warna, atau tanggal lain.`,
    })
  }

  const bufferConflict = sameVariantBookings.find((b) => {
    const bufferStart = shiftIsoDate(b.startDate, -DRY_CLEAN_BUFFER_BEFORE_DAYS)
    const bufferEnd = shiftIsoDate(b.endDate, DRY_CLEAN_BUFFER_AFTER_DAYS)
    return datesOverlap(startDate, endDate, bufferStart, bufferEnd)
  })

  if (bufferConflict) {
    const variantLabel = selectedColor
      ? `Ukuran ${selectedSize} warna ${selectedColor}`
      : `Ukuran ${selectedSize}`
    throw createError({
      statusCode: 409,
      statusMessage: `${variantLabel} sedang dalam masa jeda dry-clean & sterilisasi (1–2 hari sebelum/sesudah sewa ${bufferConflict.startDate} s/d ${bufferConflict.endDate}). Silakan pilih tanggal lain.`,
    })
  }

  const durationDays = calculateRentalDays(startDate, endDate)
  const { subtotal } = calculatePackagePricing(item.pricePerDay, durationDays)
  const deliveryFee = deliveryOption === 'kurir_antar' ? DELIVERY_FEE_COURIER : 0
  const totalPrice = subtotal + item.deposit + deliveryFee

  const totalCount = await countAllBookings()
  const seq = String(totalCount + 1).padStart(3, '0')
  const randSuffix = Math.random().toString(36).slice(2, 4).toUpperCase()
  const bookingId = `SWN-${today.replace(/-/g, '').slice(0, 6)}-${seq}${randSuffix}`

  const paymentStatus: PaymentStatus
    = paymentMethod === 'cash'
      ? 'bayar_ditempat'
      : 'belum_bayar'

  const booking: BookingRecord = {
    id: bookingId,
    userId: user.id,
    itemId: item.id,
    itemName: item.name,
    itemCategory: item.category,
    itemLocation: item.location,
    itemImageUrl: bookingImageUrl,
    ownerName: item.owner.name,
    renterName,
    renterPhone,
    selectedSize,
    selectedColor,
    startDate,
    endDate,
    durationDays,
    pricePerDay: item.pricePerDay,
    subtotal,
    deposit: item.deposit,
    deliveryOption,
    deliveryFee,
    totalPrice,
    status: 'aktif',
    paymentMethod,
    paymentStatus,
    guaranteeType,
    guaranteeNumber: guaranteeNumber || undefined,
    guaranteeStatus: 'menunggu_serah',
    fulfillmentStage: paymentStatus === 'belum_bayar' ? 'menunggu_pembayaran' : 'dry_clean',
    depositStatus: 'ditahan',
    depositRefundMethod,
    depositRefundAccount,
    depositDeduction: 0,
    notes,
    createdAt: new Date().toISOString(),
  }

  await insertBooking(booking)

  const totalFmt = `Rp${booking.totalPrice.toLocaleString('id-ID')}`
  await Promise.allSettled([
    createNotification({
      recipientRole: 'admin',
      type: 'booking_new',
      title: 'Pesanan Baru Masuk',
      message: `${booking.renterName} memesan ${booking.itemName} (${booking.startDate} s/d ${booking.endDate}) • Total ${totalFmt}.`,
      bookingId: booking.id,
      actionUrl: '/admin',
    }),
    createNotification({
      userId: user.id,
      recipientRole: 'user',
      type: 'booking_new',
      title: 'Booking Berhasil Dibuat',
      message: paymentMethod === 'cash'
        ? `Pesanan ${booking.itemName} (${booking.id}) tercatat. Siapkan pembayaran tunai ${totalFmt} & jaminan identitas saat serah-terima.`
        : `Pesanan ${booking.itemName} (${booking.id}) tercatat (${totalFmt}). Silakan selesaikan pembayaran agar segera terverifikasi.`,
      bookingId: booking.id,
      actionUrl: '/dashboard',
    }),
  ])

  setResponseStatus(event, 201)
  return booking
})
