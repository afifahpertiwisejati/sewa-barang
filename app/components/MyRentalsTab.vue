<script setup lang="ts">
import {
  Banknote,
  CalendarRange,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  IdCard,
  Loader2,
  Lock,
  MapPin,
  PackageX,
  ReceiptText,
  RotateCcw,
  Ruler,
  ShieldCheck,
  Store,
  Truck,
  XCircle,
} from 'lucide-vue-next'
import {
  DEPOSIT_REFUND_METHODS,
  GUARANTEE_OPTIONS,
  PAYMENT_ACCOUNTS,
  getTodayWibIso,
  type BookingRecord,
  type BookingStatus,
  type DepositStatus,
  type GuaranteeStatus,
  type PaymentStatus,
} from '#shared/types/rental'

const props = defineProps<{
  bookings: BookingRecord[]
  pending: boolean
}>()

const emit = defineEmits<{
  updated: []
}>()

const { isAdmin } = useAuth()
const { formatRupiah, formatDateRange } = useFormatters()
const toast = useToast()

type TabFilterKey = 'semua' | BookingStatus | 'due_return' | 'refund_pending'

const statusFilter = ref<TabFilterKey>('semua')
const updatingId = ref<string | null>(null)
const activeModalBooking = ref<BookingRecord | null>(null)
const activeDepositModalBooking = ref<BookingRecord | null>(null)

function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getReturnDueMeta(booking: BookingRecord) {
  const today = getTodayWibIso()
  const todayMs = Date.parse(`${today}T00:00:00Z`)
  const endMs = Date.parse(`${booking.endDate}T00:00:00Z`)
  const diffDays = Number.isFinite(todayMs) && Number.isFinite(endMs)
    ? Math.round((todayMs - endMs) / 86_400_000)
    : 0

  const isDue = today >= booking.endDate
  const isToday = today === booking.endDate
  const isOverdue = today > booking.endDate

  return {
    isDue,
    isToday,
    isOverdue,
    daysOverdue: Math.max(0, diffDays),
    daysLeft: Math.max(0, -diffDays),
    shortEndDate: formatShortDate(booking.endDate),
  }
}

const filteredBookings = computed(() => {
  if (statusFilter.value === 'semua') return props.bookings
  if (statusFilter.value === 'due_return') {
    return props.bookings.filter(b => b.status === 'aktif' && getReturnDueMeta(b).isDue)
  }
  if (statusFilter.value === 'refund_pending') {
    return props.bookings.filter(
      b => b.status !== 'dibatalkan' && b.deposit > 0 && b.depositStatus === 'menunggu_pengembalian',
    )
  }
  return props.bookings.filter(b => b.status === statusFilter.value)
})

const counts = computed<Record<TabFilterKey, number>>(() => ({
  semua: props.bookings.length,
  menunggu_konfirmasi: props.bookings.filter(b => b.status === 'menunggu_konfirmasi').length,
  aktif: props.bookings.filter(b => b.status === 'aktif').length,
  due_return: props.bookings.filter(b => b.status === 'aktif' && getReturnDueMeta(b).isDue).length,
  refund_pending: props.bookings.filter(
    b => b.status !== 'dibatalkan' && b.deposit > 0 && b.depositStatus === 'menunggu_pengembalian',
  ).length,
  selesai: props.bookings.filter(b => b.status === 'selesai').length,
  dibatalkan: props.bookings.filter(b => b.status === 'dibatalkan').length,
}))

async function changeStatus(booking: BookingRecord, newStatus: BookingStatus) {
  updatingId.value = booking.id
  try {
    await $fetch(`/api/bookings/${booking.id}`, {
      method: 'PATCH',
      body: { status: newStatus },
    })

    await refreshNuxtData('nav-bookings')
    emit('updated')

    if (newStatus === 'aktif') {
      toast.push('Sewa Diterima!', {
        description: `Pesanan ${booking.id} sekarang aktif (Sedang Disewa). Tombol Selesaikan Sewa akan aktif pada tanggal pengembalian (${formatShortDate(booking.endDate)}).`,
        type: 'success',
      })
    }
    else if (newStatus === 'selesai') {
      toast.push('Sewa Diselesaikan', {
        description: `Kartu jaminan dikembalikan. Deposit ${formatRupiah(booking.deposit)} kini berstatus Menunggu Pengembalian.`,
        type: 'success',
      })
    }
    else {
      toast.push('Penyewaan Dibatalkan', {
        description: `Transaksi ${booking.id} telah dibatalkan dan jadwal busana dibuka kembali.`,
        type: 'info',
      })
    }
  }
  catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string }, statusMessage?: string }
    toast.push('Gagal Memperbarui Status', {
      description: fetchErr?.data?.statusMessage || fetchErr?.statusMessage || 'Terjadi kesalahan saat memperbarui transaksi.',
      type: 'error',
    })
  }
  finally {
    updatingId.value = null
  }
}

async function confirmCashReceived(booking: BookingRecord) {
  updatingId.value = booking.id
  try {
    const updated = await $fetch<BookingRecord>(`/api/bookings/${booking.id}`, {
      method: 'PATCH',
      body: { paymentStatus: 'terverifikasi' },
    })
    emit('updated')
    toast.push('Pembayaran Cash Diterima!', {
      description: `Transaksi ${updated.paymentReference || booking.id} telah tercatat Lunas.`,
      type: 'success',
    })
  }
  catch {
    toast.push('Gagal Mengonfirmasi Pembayaran', { type: 'error' })
  }
  finally {
    updatingId.value = null
  }
}

async function changeGuaranteeStatus(booking: BookingRecord, guaranteeStatus: GuaranteeStatus) {
  updatingId.value = booking.id
  try {
    await $fetch<BookingRecord>(`/api/bookings/${booking.id}`, {
      method: 'PATCH',
      body: { guaranteeStatus },
    })
    emit('updated')
    toast.push(
      guaranteeStatus === 'dititipkan' ? 'Jaminan Diterima' : 'Jaminan Dikembalikan',
      {
        description:
          guaranteeStatus === 'dititipkan'
            ? `Kartu jaminan untuk ${booking.id} tercatat telah dititipkan di butik.`
            : `Kartu jaminan untuk ${booking.id} telah dikembalikan ke penyewa.`,
        type: 'success',
      },
    )
  }
  catch {
    toast.push('Gagal Memperbarui Status Jaminan', { type: 'error' })
  }
  finally {
    updatingId.value = null
  }
}

function handleModalPaid(updated: BookingRecord) {
  activeModalBooking.value = updated
  emit('updated')
}

function handleDepositUpdated(updated: BookingRecord) {
  activeDepositModalBooking.value = updated
  emit('updated')
}

function getDepositStatus(booking: BookingRecord): DepositStatus {
  if (booking.depositStatus) return booking.depositStatus
  return booking.status === 'selesai' ? 'dikembalikan' : 'ditahan'
}

function getDepositBadge(status: DepositStatus) {
  switch (status) {
    case 'dikembalikan':
      return {
        label: 'Deposit Dikembalikan 100%',
        classes: 'bg-[#E3E8E2] text-[#384239]',
      }
    case 'dipotong':
      return {
        label: 'Deposit Dikembalikan (Potongan)',
        classes: 'bg-[#F5E4E0] text-[#8A4438]',
      }
    case 'menunggu_pengembalian':
      return {
        label: 'Menunggu Pengembalian Deposit',
        classes: 'bg-[#F6E9D8] text-[#8C5E2A]',
      }
    case 'ditahan':
    default:
      return {
        label: 'Deposit Ditahan (Aman)',
        classes: 'bg-[#EFECE7] text-[#6B655E]',
      }
  }
}

function getStatusBadge(status: BookingStatus) {
  if (status === 'menunggu_konfirmasi') {
    return {
      label: 'Menunggu Diterima',
      classes: 'bg-amber-600 text-white',
    }
  }
  if (status === 'aktif') {
    return {
      label: 'Sedang Disewa',
      classes: 'bg-[#6F7F6C] text-white',
    }
  }
  if (status === 'selesai') {
    return {
      label: 'Selesai',
      classes: 'bg-[#EFECE7] text-[#6B655E]',
    }
  }
  return {
    label: 'Dibatalkan',
    classes: 'bg-[#F5E4E0] text-[#9E5245]',
  }
}

function getPaymentBadge(status: PaymentStatus) {
  switch (status) {
    case 'terverifikasi':
      return {
        label: 'Lunas / Berhasil',
        classes: 'bg-[#E3E8E2] text-[#384239]',
      }
    case 'bayar_ditempat':
      return {
        label: 'Cash / Bayar di Tempat',
        classes: 'bg-[#E9EFE8] text-[#455146]',
      }
    case 'belum_bayar':
    default:
      return {
        label: 'Menunggu Pembayaran',
        classes: 'bg-[#F6E9D8] text-[#8C5E2A]',
      }
  }
}

function getGuaranteeBadge(status: GuaranteeStatus) {
  switch (status) {
    case 'dititipkan':
      return {
        label: 'Jaminan Dititipkan',
        classes: 'bg-[#E3E8E2] text-[#384239]',
      }
    case 'dikembalikan':
      return {
        label: 'Jaminan Dikembalikan',
        classes: 'bg-[#EFECE7] text-[#6B655E]',
      }
    case 'menunggu_serah':
    default:
      return {
        label: 'Jaminan Menunggu Serah',
        classes: 'bg-[#F6E9D8] text-[#8C5E2A]',
      }
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Filter Pills -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="tab in ([
          { key: 'semua', label: 'Semua' },
          { key: 'menunggu_konfirmasi', label: 'Perlu Diterima' },
          { key: 'aktif', label: 'Aktif' },
          { key: 'due_return', label: 'Jatuh Tempo' },
          { key: 'refund_pending', label: 'Menunggu Refund' },
          { key: 'selesai', label: 'Selesai' },
          { key: 'dibatalkan', label: 'Dibatalkan' },
        ] as const)"
        :key="tab.key"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
        :class="
          statusFilter === tab.key
            ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
            : 'border-[#E8E3DC] bg-white text-[#6B655E] hover:border-[#2B2A28] hover:text-[#2B2A28]'
        "
        @click="statusFilter = tab.key"
      >
        <span>{{ tab.label }}</span>
        <span
          class="rounded-full px-1.5 py-0.5 text-[10px]"
          :class="
            statusFilter === tab.key
              ? 'bg-white/20 text-white'
              : (tab.key === 'menunggu_konfirmasi' || tab.key === 'due_return') && counts[tab.key] > 0
                ? 'bg-amber-100 font-semibold text-amber-800'
                : 'bg-[#FAF8F5] text-[#6B655E]'
          "
        >
          {{ counts[tab.key] }}
        </span>
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="props.pending" class="space-y-4">
      <div
        v-for="n in 2"
        :key="n"
        class="h-44 animate-pulse rounded-2xl border border-[#E8E3DC] bg-white"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredBookings.length === 0"
      class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D9D2C8] bg-white px-6 py-14 text-center"
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFECE7] text-[#6B655E]">
        <PackageX class="h-6 w-6" />
      </div>
      <h3 class="mt-4 font-serif text-lg text-[#2B2A28]">
        Belum Ada Transaksi Penyewaan
      </h3>
      <p class="mt-1 max-w-sm text-xs text-[#8A837A]">
        Belum ada transaksi pada kategori status ini. Mulai jelajahi koleksi kami.
      </p>
      <NuxtLink
        to="/"
        class="mt-5 inline-flex items-center gap-2 rounded-md bg-[#2B2A28] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#3F3D39]"
      >
        Jelajahi Koleksi
      </NuxtLink>
    </div>

    <!-- Booking Cards -->
    <div v-else class="space-y-4">
      <article
        v-for="booking in filteredBookings"
        :key="booking.id"
        class="overflow-hidden rounded-2xl border border-[#E8E3DC] bg-white p-4 transition-shadow hover:shadow-sm sm:p-5"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <!-- Left -->
          <div class="flex flex-col gap-4 sm:flex-row">
            <NuxtLink
              :to="`/items/${booking.itemId}`"
              class="h-32 w-full shrink-0 overflow-hidden rounded-xl bg-[#EFECE7] sm:h-36 sm:w-28"
            >
              <img
                :src="booking.itemImageUrl"
                :alt="booking.itemName"
                class="h-full w-full object-cover object-top transition-transform duration-300 hover:scale-105"
              >
            </NuxtLink>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="font-mono text-[11px] font-medium text-[#8A837A]">
                  {{ booking.id }}
                </span>
                <span
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide"
                  :class="getStatusBadge(booking.status).classes"
                >
                  {{ getStatusBadge(booking.status).label }}
                </span>
                <!-- Return Due-Date Status Pill for Active Bookings -->
                <span
                  v-if="booking.status === 'aktif' && getReturnDueMeta(booking).isOverdue"
                  class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700"
                >
                  <Clock class="h-3 w-3" />
                  Jatuh Tempo (Lewat {{ getReturnDueMeta(booking).daysOverdue }} hr)
                </span>
                <span
                  v-else-if="booking.status === 'aktif' && getReturnDueMeta(booking).isToday"
                  class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800"
                >
                  <Clock class="h-3 w-3" />
                  Hari Ini Tanggal Pengembalian
                </span>
                <span
                  v-else-if="booking.status === 'aktif'"
                  class="inline-flex items-center gap-1 rounded-full bg-[#F3EFE9] px-2.5 py-0.5 text-[10px] font-medium text-[#6B655E]"
                >
                  <Clock class="h-3 w-3" />
                  Kembali {{ getReturnDueMeta(booking).shortEndDate }} ({{ getReturnDueMeta(booking).daysLeft }} hr lagi)
                </span>
                <span
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                  :class="getPaymentBadge(booking.paymentStatus || 'belum_bayar').classes"
                >
                  {{ getPaymentBadge(booking.paymentStatus || 'belum_bayar').label }}
                </span>
                <span
                  v-if="booking.selectedSize"
                  class="inline-flex items-center gap-1 rounded-full bg-[#FAF8F5] px-2.5 py-0.5 text-[10px] font-medium text-[#2B2A28] ring-1 ring-[#E8E3DC]"
                >
                  <Ruler class="h-3 w-3 text-[#556256]" />
                  Size {{ booking.selectedSize }}
                </span>
                <span
                  v-if="booking.selectedColor"
                  class="inline-flex items-center gap-1 rounded-full bg-[#FAF8F5] px-2.5 py-0.5 text-[10px] font-medium text-[#2B2A28] ring-1 ring-[#E8E3DC]"
                >
                  Warna {{ booking.selectedColor }}
                </span>
              </div>

              <NuxtLink
                :to="`/items/${booking.itemId}`"
                class="mt-1.5 inline-flex items-center gap-1.5 font-serif text-lg font-medium text-[#2B2A28] hover:text-[#556256]"
              >
                <span>{{ booking.itemName }}</span>
                <ExternalLink class="h-3.5 w-3.5 shrink-0 text-[#8A837A]" />
              </NuxtLink>

              <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#6B655E]">
                <span class="inline-flex items-center gap-1">
                  <CalendarRange class="h-3.5 w-3.5 text-[#556256]" />
                  {{ formatDateRange(booking.startDate, booking.endDate) }}
                  <strong class="text-[#2B2A28]">({{ booking.durationDays }} hari)</strong>
                </span>
                <span class="inline-flex items-center gap-1">
                  <MapPin class="h-3.5 w-3.5 text-[#8A837A]" />
                  {{ booking.itemLocation }}
                </span>
                <span class="inline-flex items-center gap-1">
                  <Truck v-if="booking.deliveryOption === 'kurir_antar'" class="h-3.5 w-3.5 text-[#8A837A]" />
                  <Store v-else class="h-3.5 w-3.5 text-[#8A837A]" />
                  {{ booking.deliveryOption === 'kurir_antar' ? 'Kurir Antar' : 'Ambil Sendiri' }}
                </span>
                <span class="inline-flex items-center gap-1">
                  <Banknote v-if="booking.paymentMethod === 'cash'" class="h-3.5 w-3.5 text-[#556256]" />
                  <CreditCard v-else class="h-3.5 w-3.5 text-[#8A837A]" />
                  {{ PAYMENT_ACCOUNTS[booking.paymentMethod || 'transfer_bca']?.label }}
                  <span v-if="booking.paymentChannel" class="text-[#556256]">({{ booking.paymentChannel }})</span>
                  <span v-if="booking.paymentReference" class="font-mono text-[10px] text-[#556256]">
                    &bull; {{ booking.paymentReference }}
                  </span>
                </span>
              </div>

              <!-- Guarantee Info Row -->
              <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6B655E]">
                <span class="inline-flex items-center gap-1">
                  <IdCard class="h-3.5 w-3.5 text-[#556256]" />
                  Jaminan:
                  <strong class="font-medium text-[#2B2A28]">
                    {{ GUARANTEE_OPTIONS[booking.guaranteeType || 'ktp']?.label }}
                  </strong>
                  <span v-if="booking.guaranteeNumber" class="font-mono text-[11px] text-[#8A837A]">
                    ({{ booking.guaranteeNumber }})
                  </span>
                </span>
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  :class="getGuaranteeBadge(booking.guaranteeStatus || 'menunggu_serah').classes"
                >
                  {{ getGuaranteeBadge(booking.guaranteeStatus || 'menunggu_serah').label }}
                </span>
              </div>

              <!-- Deposit Refund Status Row -->
              <div v-if="booking.deposit > 0 && booking.status !== 'dibatalkan'" class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6B655E]">
                <span class="inline-flex items-center gap-1">
                  <ShieldCheck class="h-3.5 w-3.5 text-[#556256]" />
                  Deposit:
                  <strong class="font-medium text-[#2B2A28]">
                    {{ formatRupiah(booking.deposit) }}
                  </strong>
                  <span v-if="booking.depositRefundMethod" class="text-[11px] text-[#8A837A]">
                    &rarr; {{ DEPOSIT_REFUND_METHODS[booking.depositRefundMethod]?.label }}
                  </span>
                  <span v-if="booking.depositRefundReference" class="font-mono text-[10px] text-[#556256]">
                    &bull; {{ booking.depositRefundReference }}
                  </span>
                </span>
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  :class="getDepositBadge(getDepositStatus(booking)).classes"
                >
                  {{ getDepositBadge(getDepositStatus(booking)).label }}
                </span>
              </div>

              <p class="mt-2 text-xs text-[#8A837A]">
                Pemilik: <strong class="font-medium text-[#2B2A28]">{{ booking.ownerName }}</strong>
                &bull; Penyewa: <strong class="font-medium text-[#2B2A28]">{{ booking.renterName }}</strong>
                ({{ booking.renterPhone }})
              </p>
              <p v-if="booking.notes" class="mt-1 text-xs italic text-[#8A837A]">
                Catatan: "{{ booking.notes }}"
              </p>

              <!-- Payment Transaction & Guarantee Action Strip -->
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <!-- Pay Now button for unpaid booking -->
                <button
                  v-if="(booking.status === 'aktif' || booking.status === 'menunggu_konfirmasi') && booking.paymentStatus === 'belum_bayar'"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-md bg-[#2B2A28] px-3.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-[#3F3D39]"
                  @click="activeModalBooking = booking"
                >
                  <CreditCard class="h-3.5 w-3.5" />
                  Bayar Sekarang
                </button>

                <!-- Receipt button for paid or cash bookings -->
                <button
                  v-else
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-md border border-[#E8E3DC] bg-[#FAF8F5] px-3 py-1.5 text-[11px] font-medium text-[#2B2A28] transition-colors hover:border-[#2B2A28] hover:bg-white"
                  @click="activeModalBooking = booking"
                >
                  <ReceiptText class="h-3.5 w-3.5 text-[#556256]" />
                  Struk / Bukti Transaksi
                </button>

                <!-- Admin confirm Cash received -->
                <button
                  v-if="isAdmin && (booking.status === 'aktif' || booking.status === 'menunggu_konfirmasi') && booking.paymentMethod === 'cash' && booking.paymentStatus === 'bayar_ditempat'"
                  type="button"
                  :disabled="updatingId === booking.id"
                  class="inline-flex items-center gap-1 rounded-md bg-[#556256] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#455146] disabled:opacity-60"
                  @click="confirmCashReceived(booking)"
                >
                  <Banknote class="h-3.5 w-3.5" />
                  Konfirmasi Terima Cash
                </button>

                <!-- Admin guarantee handover controls -->
                <button
                  v-if="isAdmin && (booking.status === 'aktif' || booking.status === 'menunggu_konfirmasi') && (booking.guaranteeStatus || 'menunggu_serah') === 'menunggu_serah'"
                  type="button"
                  :disabled="updatingId === booking.id"
                  class="inline-flex items-center gap-1 rounded-md border border-[#C7D1C5] bg-[#F3F5F2] px-3 py-1.5 text-[11px] font-medium text-[#384239] hover:bg-[#E3E8E2] disabled:opacity-60"
                  @click="changeGuaranteeStatus(booking, 'dititipkan')"
                >
                  <IdCard class="h-3.5 w-3.5" />
                  Terima Jaminan
                </button>
                <button
                  v-else-if="isAdmin && booking.status === 'aktif' && booking.guaranteeStatus === 'dititipkan'"
                  type="button"
                  :disabled="updatingId === booking.id"
                  class="inline-flex items-center gap-1 rounded-md border border-[#E8E3DC] bg-white px-3 py-1.5 text-[11px] font-medium text-[#6B655E] hover:border-[#2B2A28] hover:text-[#2B2A28] disabled:opacity-60"
                  @click="changeGuaranteeStatus(booking, 'dikembalikan')"
                >
                  <IdCard class="h-3.5 w-3.5" />
                  Kembalikan Jaminan
                </button>

                <!-- Deposit Refund Trigger (Renter Request / Admin Process / Receipt) -->
                <button
                  v-if="booking.deposit > 0 && booking.status !== 'dibatalkan' && booking.status !== 'menunggu_konfirmasi'"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors"
                  :class="
                    getDepositStatus(booking) === 'dikembalikan' || getDepositStatus(booking) === 'dipotong'
                      ? 'border border-[#C7D1C5] bg-[#F3F5F2] text-[#384239] hover:bg-[#E3E8E2]'
                      : isAdmin && getDepositStatus(booking) === 'menunggu_pengembalian'
                        ? 'bg-[#8C5E2A] text-white hover:bg-[#734C20]'
                        : 'border border-[#D7C4A3] bg-[#FDF8EF] text-[#7D5720] hover:bg-[#F7ECDA]'
                  "
                  @click="activeDepositModalBooking = booking"
                >
                  <RotateCcw class="h-3.5 w-3.5" />
                  <span>
                    {{
                      getDepositStatus(booking) === 'dikembalikan' || getDepositStatus(booking) === 'dipotong'
                        ? 'Bukti Pengembalian Deposit'
                        : isAdmin
                          ? 'Proses Pengembalian Deposit'
                          : getDepositStatus(booking) === 'menunggu_pengembalian'
                            ? 'Ubah Rekening Refund'
                            : 'Ajukan Pengembalian Deposit'
                    }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- Right -->
          <div class="flex flex-col justify-between gap-3 border-t border-[#EFECE7] pt-4 lg:w-64 lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <div class="space-y-1 text-xs">
              <div class="flex justify-between text-[#8A837A]">
                <span>Subtotal ({{ booking.durationDays }} hr)</span>
                <span class="font-medium text-[#2B2A28]">{{ formatRupiah(booking.subtotal) }}</span>
              </div>
              <div class="flex justify-between text-[#8A837A]">
                <span>Deposit (Refundable)</span>
                <span class="font-medium text-[#2B2A28]">{{ formatRupiah(booking.deposit) }}</span>
              </div>
              <div class="flex justify-between text-[#8A837A]">
                <span>Pengiriman</span>
                <span class="font-medium text-[#2B2A28]">
                  {{ booking.deliveryFee === 0 ? 'Gratis' : formatRupiah(booking.deliveryFee) }}
                </span>
              </div>
              <div class="flex justify-between border-t border-[#EFECE7] pt-1.5 text-sm">
                <span class="font-medium text-[#2B2A28]">Total</span>
                <span class="font-serif font-medium text-[#2B2A28]">{{ formatRupiah(booking.totalPrice) }}</span>
              </div>
            </div>

            <!-- Action Buttons: Step 1 -> Waiting for Admin to Accept ("Terima Sewa") -->
            <div v-if="booking.status === 'menunggu_konfirmasi'" class="space-y-2">
              <template v-if="isAdmin">
                <div class="flex gap-2">
                  <button
                    type="button"
                    :disabled="updatingId === booking.id"
                    class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#556256] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#455146] disabled:opacity-60"
                    @click="changeStatus(booking, 'aktif')"
                  >
                    <Loader2 v-if="updatingId === booking.id" class="h-3.5 w-3.5 animate-spin" />
                    <CheckCircle2 v-else class="h-3.5 w-3.5" />
                    Terima Sewa
                  </button>
                  <button
                    type="button"
                    :disabled="updatingId === booking.id"
                    class="inline-flex items-center justify-center gap-1 rounded-md border border-[#E8D0CB] bg-[#FAF4F1] px-3 py-2 text-xs font-medium text-[#9E5245] transition-colors hover:bg-[#F3E2DD] disabled:opacity-60"
                    @click="changeStatus(booking, 'dibatalkan')"
                  >
                    <XCircle class="h-3.5 w-3.5" />
                    Tolak
                  </button>
                </div>
                <p class="text-[10.5px] leading-snug text-[#8A837A]">
                  Klik <strong>Terima Sewa</strong> untuk mengonfirmasi pesanan penyewa.
                </p>
              </template>
              <template v-else>
                <p class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] font-medium text-amber-800">
                  Menunggu konfirmasi Terima Sewa dari Admin Butik
                </p>
                <button
                  type="button"
                  :disabled="updatingId === booking.id"
                  class="inline-flex w-full items-center justify-center gap-1 rounded-md border border-[#E8D0CB] bg-[#FAF4F1] px-3 py-1.5 text-xs font-medium text-[#9E5245] transition-colors hover:bg-[#F3E2DD] disabled:opacity-60"
                  @click="changeStatus(booking, 'dibatalkan')"
                >
                  <XCircle class="h-3.5 w-3.5" />
                  Batalkan Pesanan
                </button>
              </template>
            </div>

            <!-- Action Buttons: Step 2 -> Active Rental (Completable ONLY on/after return due date) -->
            <div v-else-if="booking.status === 'aktif'" class="space-y-2">
              <template v-if="isAdmin">
                <div class="flex gap-2">
                  <button
                    v-if="getReturnDueMeta(booking).isDue"
                    type="button"
                    :disabled="updatingId === booking.id"
                    class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#556256] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#455146] disabled:opacity-60"
                    @click="changeStatus(booking, 'selesai')"
                  >
                    <Loader2 v-if="updatingId === booking.id" class="h-3.5 w-3.5 animate-spin" />
                    <CheckCircle2 v-else class="h-3.5 w-3.5" />
                    Selesaikan Sewa
                  </button>
                  <button
                    v-else
                    type="button"
                    disabled
                    :title="`Selesaikan Sewa baru aktif pada tanggal pengembalian (${booking.endDate})`"
                    class="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-[#E0DBD3] bg-[#F3F0EB] px-3 py-2 text-[11px] font-medium text-[#8A837A]"
                  >
                    <Lock class="h-3.5 w-3.5" />
                    Selesai ({{ getReturnDueMeta(booking).shortEndDate }})
                  </button>
                  <button
                    type="button"
                    :disabled="updatingId === booking.id"
                    class="inline-flex items-center justify-center gap-1 rounded-md border border-[#E8D0CB] bg-[#FAF4F1] px-3 py-2 text-xs font-medium text-[#9E5245] transition-colors hover:bg-[#F3E2DD] disabled:opacity-60"
                    @click="changeStatus(booking, 'dibatalkan')"
                  >
                    <XCircle class="h-3.5 w-3.5" />
                    Batalkan
                  </button>
                </div>
                <p
                  v-if="!getReturnDueMeta(booking).isDue"
                  class="text-[10.5px] leading-snug text-[#8A837A]"
                >
                  Tombol <strong>Selesaikan Sewa</strong> aktif otomatis mulai tanggal pengembalian ({{ getReturnDueMeta(booking).shortEndDate }}).
                </p>
                <p
                  v-else
                  class="text-[10.5px] font-medium leading-snug"
                  :class="getReturnDueMeta(booking).isOverdue ? 'text-rose-700' : 'text-amber-800'"
                >
                  {{ getReturnDueMeta(booking).isOverdue
                    ? `Sudah jatuh tempo (${getReturnDueMeta(booking).daysOverdue} hari) — silakan cek busana & selesaikan sewa.`
                    : 'Hari ini tanggal pengembalian — silakan cek busana & selesaikan sewa.' }}
                </p>
              </template>
              <template v-else>
                <p
                  class="rounded-lg px-3 py-2 text-center text-[11px] font-medium"
                  :class="
                    getReturnDueMeta(booking).isDue
                      ? 'border border-amber-200 bg-amber-50 text-amber-800'
                      : 'bg-[#F3F5F2] text-[#556256]'
                  "
                >
                  {{ getReturnDueMeta(booking).isDue
                    ? 'Tanggal pengembalian telah tiba. Kembalikan busana agar Admin menyelesaikan sewa.'
                    : `Sewa diterima & aktif • Kembali ${getReturnDueMeta(booking).shortEndDate}` }}
                </p>
              </template>
            </div>

            <div
              v-else-if="booking.status === 'selesai'"
              class="space-y-1.5"
            >
              <p
                v-if="getDepositStatus(booking) === 'dikembalikan'"
                class="rounded-lg bg-[#F3F5F2] px-3 py-2 text-center text-[11px] font-medium text-[#556256]"
              >
                Deposit {{ formatRupiah(booking.depositRefundAmount ?? booking.deposit) }} telah dikembalikan
              </p>
              <p
                v-else-if="getDepositStatus(booking) === 'dipotong'"
                class="rounded-lg bg-[#FAF4F1] px-3 py-2 text-center text-[11px] font-medium text-[#8A4438]"
              >
                Dikembalikan {{ formatRupiah(booking.depositRefundAmount ?? 0) }} (potongan {{ formatRupiah(booking.depositDeduction ?? 0) }})
              </p>
              <button
                v-else
                type="button"
                class="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#D7C4A3] bg-[#FDF8EF] px-3 py-2 text-[11px] font-semibold text-[#7D5720] hover:bg-[#F7ECDA]"
                @click="activeDepositModalBooking = booking"
              >
                <RotateCcw class="h-3.5 w-3.5" />
                {{ isAdmin ? 'Cairkan Deposit Sekarang' : 'Menunggu Pengembalian Deposit' }}
              </button>
            </div>
            <p
              v-else
              class="rounded-lg bg-[#FAF8F5] px-3 py-2 text-center text-[11px] text-[#8A837A]"
            >
              Transaksi dibatalkan
            </p>
          </div>
        </div>
      </article>
    </div>

    <!-- Shared Interactive Payment Checkout & Receipt Modal -->
    <PaymentModal
      :booking="activeModalBooking"
      @close="activeModalBooking = null"
      @paid="handleModalPaid"
    />

    <!-- Deposit Refund Request, Processing & Receipt Modal -->
    <DepositRefundModal
      :booking="activeDepositModalBooking"
      @close="activeDepositModalBooking = null"
      @updated="handleDepositUpdated"
    />
  </div>
</template>
