export const RENTAL_CATEGORIES = [
  'Kebaya Modern',
  'Gaun Pesta',
  'Jas Pria',
  'High Heels',
  'Sepatu Pantofel',
] as const

export const CATEGORY_MATERIAL_SPECS: Record<(typeof RENTAL_CATEGORIES)[number], string> = {
  'Kebaya Modern': 'Brokat Prancis Lembut + Full Furing',
  'Gaun Pesta': 'Satin Silk / Tulle Halus + Full Furing',
  'Jas Pria': 'Semi-Wool / High-Twist Anti Kusut',
  'High Heels': 'Kulit Sintetis Halus + Bantalan Empuk',
  'Sepatu Pantofel': 'Kulit Sintetis Halus + Bantalan Empuk',
}

export const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'All Size'] as const
export const SHOE_SIZES_WOMEN = ['36', '37', '38', '39', '40'] as const
export const SHOE_SIZES_MEN = ['40', '41', '42', '43', '44'] as const

export type RentalCategory = (typeof RENTAL_CATEGORIES)[number]
export type CategoryFilter = 'Semua' | RentalCategory
export type ItemStatus = 'Tersedia' | 'Sedang Disewa'
export type DeliveryOption = 'ambil_sendiri' | 'kurir_antar'
export type BookingStatus = 'aktif' | 'selesai' | 'dibatalkan'
export type PaymentMethod = 'cash' | 'transfer_bca' | 'transfer_mandiri' | 'qris' | 'gopay'
export type PaymentStatus = 'belum_bayar' | 'bayar_ditempat' | 'terverifikasi'
export type GuaranteeType = 'ktp' | 'sim' | 'ktm' | 'kk_paspor'
export type GuaranteeStatus = 'menunggu_serah' | 'dititipkan' | 'dikembalikan'
export type HandoverStatus = 'belum_diterima' | 'diterima'
export type FulfillmentStage
  = | 'menunggu_pembayaran'
    | 'dry_clean'
    | 'siap_ambil_kirim'
    | 'sedang_disewa'
    | 'selesai_deposit'
export type DepositStatus = 'ditahan' | 'menunggu_pengembalian' | 'dikembalikan' | 'dipotong'
export type DepositRefundMethod = 'transfer_bca' | 'transfer_mandiri' | 'transfer_bri' | 'gopay' | 'dana' | 'ovo' | 'cash'
export type SortOption = 'newest' | 'price_asc' | 'rating_desc'

export interface ItemOwner {
  name: string
  city: string
  verified: boolean
  joinedYear: number
  responseRate: number
  totalRentals: number
  avatarInitials: string
}

export interface ItemSpec {
  label: string
  value: string
}

export interface ItemColorVariant {
  name: string
  hex: string
  imageUrl: string
  sizes?: string[]
}

export interface RentalItem {
  id: string
  name: string
  category: RentalCategory
  location: string
  pricePerDay: number
  deposit: number
  rating: number
  reviewCount: number
  status: ItemStatus
  sizes: string[]
  colors?: ItemColorVariant[]
  imageUrl: string
  gallery: string[]
  description: string
  specs: ItemSpec[]
  owner: ItemOwner
  createdAt: string
}

export interface BookedDateRange {
  bookingId: string
  startDate: string
  endDate: string
  selectedSize?: string
  selectedColor?: string
}

export interface RentalItemDetail extends RentalItem {
  bookedRanges: BookedDateRange[]
}

export interface BookingRecord {
  id: string
  userId?: string
  itemId: string
  itemName: string
  itemCategory: RentalCategory
  itemLocation: string
  itemImageUrl: string
  ownerName: string
  renterName: string
  renterPhone: string
  selectedSize: string
  selectedColor?: string
  startDate: string
  endDate: string
  durationDays: number
  pricePerDay: number
  subtotal: number
  deposit: number
  deliveryOption: DeliveryOption
  deliveryFee: number
  totalPrice: number
  status: BookingStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paymentChannel?: string
  paymentReference?: string
  paymentPaidAt?: string
  guaranteeType: GuaranteeType
  guaranteeNumber?: string
  guaranteeStatus: GuaranteeStatus
  handoverStatus?: HandoverStatus
  handoverRecipient?: string
  handoverConfirmedAt?: string
  fulfillmentStage?: FulfillmentStage
  depositStatus?: DepositStatus
  depositRefundMethod?: DepositRefundMethod
  depositRefundAccount?: string
  depositRefundAmount?: number
  depositDeduction?: number
  depositRefundReference?: string
  depositRefundNote?: string
  depositRefundedAt?: string
  notes?: string
  createdAt: string
}

export interface CreateItemPayload {
  name: string
  category: RentalCategory
  location: string
  pricePerDay: number
  deposit: number
  description: string
  imageUrl: string
  gallery?: string[]
  sizes?: string[]
  specs?: ItemSpec[]
  ownerName?: string
}

export interface CreateBookingPayload {
  itemId: string
  startDate: string
  endDate: string
  selectedSize?: string
  selectedColor?: string
  deliveryOption: DeliveryOption
  paymentMethod?: PaymentMethod
  guaranteeType?: GuaranteeType
  guaranteeNumber?: string
  depositRefundMethod?: DepositRefundMethod
  depositRefundAccount?: string
  agreedToTerms?: boolean
  renterName: string
  renterPhone: string
  notes?: string
}

export const PAYMENT_ACCOUNTS: Record<PaymentMethod, { label: string, account: string, holder: string, isCash?: boolean }> = {
  cash: {
    label: 'Cash / Tunai',
    account: 'Bayar Tunai di Butik / COD',
    holder: 'Dibayar langsung saat ambil busana atau saat kurir tiba',
    isCash: true,
  },
  transfer_bca: {
    label: 'Transfer BCA',
    account: '1234-5678-90',
    holder: 'a.n. Seruni Atelier Indonesia',
  },
  transfer_mandiri: {
    label: 'Transfer Mandiri',
    account: '137-00-9876543-2',
    holder: 'a.n. Seruni Atelier Indonesia',
  },
  qris: {
    label: 'QRIS',
    account: 'NMID: ID1026008899123',
    holder: 'Merchant: Seruni Atelier',
  },
  gopay: {
    label: 'GoPay / E-Wallet',
    account: '0831-3049-5590',
    holder: 'a.n. Ayu Prameswari (Seruni Atelier)',
  },
}

export const GUARANTEE_OPTIONS: Record<GuaranteeType, { label: string, description: string }> = {
  ktp: {
    label: 'E-KTP Asli',
    description: 'Kartu identitas resmi, dikembalikan utuh saat busana kembali',
  },
  sim: {
    label: 'SIM Asli (A / C)',
    description: 'Alternatif jaminan identitas resmi selain KTP',
  },
  ktm: {
    label: 'KTM / Kartu Pelajar',
    description: 'Khusus mahasiswa & pelajar (wisuda / prom)',
  },
  kk_paspor: {
    label: 'KK / Paspor Asli',
    description: 'Untuk penyewaan paket lamaran atau keluarga',
  },
}

export const DEPOSIT_REFUND_METHODS: Record<DepositRefundMethod, { label: string, placeholder: string, isCash?: boolean }> = {
  transfer_bca: {
    label: 'Transfer BCA',
    placeholder: 'Contoh: 1234567890 a.n. Salsabila Putri',
  },
  transfer_mandiri: {
    label: 'Transfer Mandiri',
    placeholder: 'Contoh: 1370098765432 a.n. Salsabila Putri',
  },
  transfer_bri: {
    label: 'Transfer BRI',
    placeholder: 'Contoh: 001201001234501 a.n. Salsabila Putri',
  },
  gopay: {
    label: 'GoPay',
    placeholder: 'Contoh: 0812-3456-7890 a.n. Salsabila Putri',
  },
  dana: {
    label: 'DANA',
    placeholder: 'Contoh: 0812-3456-7890 a.n. Salsabila Putri',
  },
  ovo: {
    label: 'OVO',
    placeholder: 'Contoh: 0812-3456-7890 a.n. Salsabila Putri',
  },
  cash: {
    label: 'Tunai di Butik',
    placeholder: 'Diambil langsung tunai saat pengembalian busana',
    isCash: true,
  },
}

export interface ItemsListResponse {
  items: RentalItem[]
  total: number
  availableCities: string[]
  maxCatalogPrice: number
}

export type NotificationType
  = | 'booking_new'
    | 'payment_confirmed'
    | 'guarantee_updated'
    | 'deposit_requested'
    | 'deposit_refunded'
    | 'booking_completed'
    | 'booking_cancelled'
    | 'system'

export interface NotificationRecord {
  id: string
  userId?: string
  recipientRole: 'user' | 'admin'
  type: NotificationType
  title: string
  message: string
  bookingId?: string
  actionUrl?: string
  isRead: boolean
  createdAt: string
}

export interface NotificationsListResponse {
  notifications: NotificationRecord[]
  unreadCount: number
}

export const DELIVERY_FEE_COURIER = 15000
export const STANDARD_PACKAGE_DAYS = 3
export const DRY_CLEAN_BUFFER_BEFORE_DAYS = 1
export const DRY_CLEAN_BUFFER_AFTER_DAYS = 2

export function getExtraDayRate(packagePrice: number): number {
  const raw = Math.round(packagePrice / STANDARD_PACKAGE_DAYS / 5000) * 5000
  return Math.max(15000, raw)
}

export function calculatePackagePricing(packagePrice: number, durationDays: number): {
  basePackagePrice: number
  extraDays: number
  extraDayRate: number
  extraTotal: number
  subtotal: number
} {
  const safeDays = Math.max(1, durationDays)
  const extraDays = Math.max(0, safeDays - STANDARD_PACKAGE_DAYS)
  const extraDayRate = getExtraDayRate(packagePrice)
  const extraTotal = extraDays * extraDayRate
  return {
    basePackagePrice: packagePrice,
    extraDays,
    extraDayRate,
    extraTotal,
    subtotal: packagePrice + extraTotal,
  }
}

export function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const parts = isoDate.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (!y || !m || !d) return isoDate
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays))
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function resolveBookingStage(booking: BookingRecord): {
  stage: FulfillmentStage
  stepIndex: number
  isDepositPending: boolean
} {
  if (booking.status === 'selesai') {
    const isDepositPending = booking.deposit > 0
      && booking.depositStatus !== 'dikembalikan'
      && booking.depositStatus !== 'dipotong'
    return {
      stage: 'selesai_deposit',
      stepIndex: 4,
      isDepositPending,
    }
  }

  if (booking.paymentStatus === 'belum_bayar') {
    return {
      stage: 'menunggu_pembayaran',
      stepIndex: 0,
      isDepositPending: false,
    }
  }

  if (booking.handoverStatus === 'diterima' || booking.fulfillmentStage === 'sedang_disewa') {
    return {
      stage: 'sedang_disewa',
      stepIndex: 3,
      isDepositPending: false,
    }
  }

  if (booking.fulfillmentStage === 'siap_ambil_kirim') {
    return {
      stage: 'siap_ambil_kirim',
      stepIndex: 2,
      isDepositPending: false,
    }
  }

  return {
    stage: 'dry_clean',
    stepIndex: 1,
    isDepositPending: false,
  }
}
