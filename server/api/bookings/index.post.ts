import {
  DELIVERY_FEE_COURIER,
  type BookingRecord,
  type CreateBookingPayload,
  type DeliveryOption,
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

  const item = await findItemById(itemId)
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Busana tidak ditemukan.' })
  }

  const selectedSize = typeof body?.selectedSize === 'string' && body.selectedSize.trim()
    ? body.selectedSize.trim()
    : (item.sizes[0] ?? 'All Size')
  const matchedColor = typeof body?.selectedColor === 'string' && body.selectedColor.trim()
    ? item.colors?.find(c => c.name.toLowerCase() === body.selectedColor!.trim().toLowerCase())
    : item.colors?.[0]
  const selectedColor = matchedColor?.name
    || (typeof body?.selectedColor === 'string' && body.selectedColor.trim() ? body.selectedColor.trim() : undefined)
  const bookingImageUrl = matchedColor?.imageUrl || item.imageUrl

  const activeBookings = await listActiveBookingsByItemId(item.id)
  const conflict = activeBookings.find(
    b => datesOverlap(startDate, endDate, b.startDate, b.endDate),
  )

  if (conflict) {
    throw createError({
      statusCode: 409,
      statusMessage: `Tanggal tersebut bentrok dengan jadwal sewa aktif (${conflict.startDate} s/d ${conflict.endDate}). Silakan pilih rentang tanggal lain.`,
    })
  }

  const durationDays = calculateRentalDays(startDate, endDate)
  const subtotal = durationDays * item.pricePerDay
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
    status: 'menunggu_konfirmasi',
    paymentMethod,
    paymentStatus,
    guaranteeType,
    guaranteeNumber: guaranteeNumber || undefined,
    guaranteeStatus: 'menunggu_serah',
    depositStatus: 'ditahan',
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
      title: 'Pesanan Baru — Perlu Diterima',
      message: `${booking.renterName} memesan ${booking.itemName} (${booking.startDate} s/d ${booking.endDate}) • Total ${totalFmt}. Klik Terima Sewa untuk menyetujui.`,
      bookingId: booking.id,
      actionUrl: '/admin',
    }),
    createNotification({
      userId: user.id,
      recipientRole: 'user',
      type: 'booking_new',
      title: 'Booking Terkirim — Menunggu Diterima Admin',
      message: paymentMethod === 'cash'
        ? `Pesanan ${booking.itemName} (${booking.id}) tercatat (${totalFmt}) dan menunggu konfirmasi Terima Sewa dari Admin Butik.`
        : `Pesanan ${booking.itemName} (${booking.id}) tercatat (${totalFmt}). Selesaikan pembayaran & tunggu konfirmasi Terima Sewa dari Admin Butik.`,
      bookingId: booking.id,
      actionUrl: '/dashboard',
    }),
  ])

  setResponseStatus(event, 201)
  return booking
})
