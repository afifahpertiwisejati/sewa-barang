<script setup lang="ts">
import {
  AlertTriangle,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  IdCard,
  Loader2,
  ReceiptText,
  RefreshCw,
  Ruler,
  Shield,
  Sparkles,
  Store,
  Truck,
} from 'lucide-vue-next'
import {
  DELIVERY_FEE_COURIER,
  DRY_CLEAN_BUFFER_AFTER_DAYS,
  DRY_CLEAN_BUFFER_BEFORE_DAYS,
  GUARANTEE_OPTIONS,
  PAYMENT_ACCOUNTS,
  shiftIsoDate,
  type BookedDateRange,
  type BookingRecord,
  type DeliveryOption,
  type GuaranteeType,
  type PaymentMethod,
  type RentalItemDetail,
} from '#shared/types/rental'

const props = defineProps<{
  item: RentalItemDetail
  selectedColor?: string
  isRefreshingStock?: boolean
}>()

const emit = defineEmits<{
  booked: [booking: BookingRecord]
  'update:selectedColor': [color: string]
  'refresh-stock': []
}>()

const route = useRoute()
const { user, isLoggedIn } = useAuth()
const { filters } = useCatalogFilters()
const { openSizeGuide } = useSizeGuide()
const { formatRupiah, formatDate, calculateDurationDays, getOffsetIsoDate } = useFormatters()
const toast = useToast()

const todayIso = getOffsetIsoDate(0)
const defaultStart = computed(() =>
  filters.value.startDate && filters.value.startDate >= todayIso
    ? filters.value.startDate
    : getOffsetIsoDate(1),
)
const defaultEnd = computed(() =>
  filters.value.endDate && filters.value.endDate >= defaultStart.value
    ? filters.value.endDate
    : getOffsetIsoDate(3),
)

const availableColors = computed(() => props.item.colors ?? [])
const hasMultipleColors = computed(() => availableColors.value.length > 1)
const activeColor = computed({
  get: () => props.selectedColor || availableColors.value[0]?.name || '',
  set: (val: string) => emit('update:selectedColor', val),
})
const activeColorVariant = computed(() =>
  availableColors.value.find(c => c.name.toLowerCase() === activeColor.value.toLowerCase()) ?? null,
)

function getOfferedSizesForColor(colorName: string): string[] {
  const baseSizes = props.item.sizes?.length ? props.item.sizes : ['All Size']
  if (!colorName) return baseSizes
  const variant = availableColors.value.find(c => c.name.toLowerCase() === colorName.toLowerCase())
  if (variant && Array.isArray(variant.sizes)) {
    return variant.sizes
  }
  return baseSizes
}

const availableSizes = computed(() => {
  const baseSizes = props.item.sizes?.length ? props.item.sizes : ['All Size']
  const variantSizes = activeColorVariant.value?.sizes
  if (variantSizes && variantSizes.length > 0) {
    return Array.from(new Set([...baseSizes, ...variantSizes]))
  }
  return baseSizes
})

const selectedSize = ref(availableSizes.value[0] ?? 'All Size')
const startDate = ref(defaultStart.value)
const endDate = ref(defaultEnd.value)

function getVariantBookedRanges(size: string, colorName: string): BookedDateRange[] {
  const targetSize = size.trim().toLowerCase()
  const targetColor = colorName.trim().toLowerCase()
  return props.item.bookedRanges.filter((range) => {
    if (range.selectedSize && range.selectedSize.trim().toLowerCase() !== targetSize) {
      return false
    }
    if (hasMultipleColors.value && targetColor && range.selectedColor) {
      return range.selectedColor.trim().toLowerCase() === targetColor
    }
    return true
  })
}

function getBookingConflict(size: string, colorName: string): { range: BookedDateRange, kind: 'booked' | 'buffer' } | undefined {
  if (!startDate.value || !endDate.value) return undefined
  const matches = getVariantBookedRanges(size, colorName)

  const direct = matches.find(
    range => startDate.value <= range.endDate && range.startDate <= endDate.value,
  )
  if (direct) {
    return { range: direct, kind: 'booked' }
  }

  const buffer = matches.find((range) => {
    const bufferStart = shiftIsoDate(range.startDate, -DRY_CLEAN_BUFFER_BEFORE_DAYS)
    const bufferEnd = shiftIsoDate(range.endDate, DRY_CLEAN_BUFFER_AFTER_DAYS)
    return startDate.value <= bufferEnd && bufferStart <= endDate.value
  })
  if (buffer) {
    return { range: buffer, kind: 'buffer' }
  }

  return undefined
}

const sizeStates = computed(() => {
  const offeredForColor = getOfferedSizesForColor(activeColor.value)
  return availableSizes.value.map((size) => {
    const inStockForColor = offeredForColor.includes(size)
    const conflictInfo = inStockForColor ? getBookingConflict(size, activeColor.value) : undefined
    const available = inStockForColor && !conflictInfo
    return {
      size,
      inStockForColor,
      conflict: conflictInfo?.range,
      conflictKind: conflictInfo?.kind,
      available,
      statusLabel: !inStockForColor
        ? 'Habis'
        : conflictInfo?.kind === 'buffer'
          ? 'Dry-Clean'
          : conflictInfo?.kind === 'booked'
            ? 'Terpesan'
            : 'Tersedia',
    }
  })
})

const selectedSizeState = computed(() =>
  sizeStates.value.find(s => s.size === selectedSize.value) ?? sizeStates.value[0] ?? null,
)

const activeVariantBookedRanges = computed(() =>
  getVariantBookedRanges(selectedSize.value, activeColor.value),
)

const calendarVariantLabel = computed(() => {
  if (activeColor.value) return `${activeColor.value} · Size ${selectedSize.value}`
  return `Size ${selectedSize.value}`
})

const activeColorReadyCount = computed(() =>
  sizeStates.value.filter(s => s.available).length,
)

function getColorStockSummary(colorName: string) {
  const offered = getOfferedSizesForColor(colorName)
  const total = offered.length
  const ready = offered.filter(sz => !getBookingConflict(sz, colorName)).length
  return { ready, total }
}

const relevantBookedRanges = computed(() => {
  if (!hasMultipleColors.value || !activeColor.value) {
    return props.item.bookedRanges
  }
  const targetColor = activeColor.value.trim().toLowerCase()
  return props.item.bookedRanges.filter(
    r => !r.selectedColor || r.selectedColor.trim().toLowerCase() === targetColor,
  )
})
const deliveryOption = ref<DeliveryOption>('ambil_sendiri')
const paymentMethod = ref<PaymentMethod | ''>('')
const selectedQrisChannel = ref('BCA Mobile')
const activeModalBooking = ref<BookingRecord | null>(null)
const showTermsModal = ref(false)
const guaranteeType = ref<GuaranteeType>('ktp')

const qrisChannels = [
  'BCA Mobile',
  'Livin\' Mandiri',
  'BRImo',
  'GoPay',
  'DANA',
  'ShopeePay',
]
const guaranteeNumber = ref('')
const copiedAccount = ref(false)
const renterName = ref(user.value?.name || '')
const renterPhone = ref(user.value?.phone || '')
const notes = ref('')

watch(user, (u) => {
  if (u) {
    if (!renterName.value) renterName.value = u.name
    if (!renterPhone.value) renterPhone.value = u.phone
  }
})

const isSubmitting = ref(false)
const submitError = ref('')
const createdBooking = ref<BookingRecord | null>(null)

const paymentMethods = Object.entries(PAYMENT_ACCOUNTS) as [PaymentMethod, { label: string, account: string, holder: string, isCash?: boolean }][]
const activePaymentInfo = computed(() => (paymentMethod.value ? PAYMENT_ACCOUNTS[paymentMethod.value] : null))
const isCashPayment = computed(() => paymentMethod.value === 'cash')
const guaranteeOptions = Object.entries(GUARANTEE_OPTIONS) as [GuaranteeType, { label: string, description: string }][]
const activeGuaranteeInfo = computed(() => GUARANTEE_OPTIONS[guaranteeType.value])

watch(
  [sizeStates, activeColor],
  () => {
    const current = sizeStates.value.find(s => s.size === selectedSize.value)
    if (!current || !current.available) {
      const firstAvailable = sizeStates.value.find(s => s.available)
      if (firstAvailable) {
        selectedSize.value = firstAvailable.size
      }
      else if (!current && sizeStates.value[0]) {
        selectedSize.value = sizeStates.value[0].size
      }
    }
  },
  { immediate: true },
)

watch(startDate, (newStart) => {
  if (newStart && endDate.value && endDate.value < newStart) {
    endDate.value = newStart
  }
  submitError.value = ''
})

watch(endDate, () => {
  submitError.value = ''
})

const durationDays = computed(() => calculateDurationDays(startDate.value, endDate.value))
const subtotal = computed(() => durationDays.value * props.item.pricePerDay)
const deliveryFee = computed(() =>
  deliveryOption.value === 'kurir_antar' ? DELIVERY_FEE_COURIER : 0,
)
const totalPrice = computed(() => subtotal.value + props.item.deposit + deliveryFee.value)

const dateValidationError = computed(() => {
  if (!startDate.value || !endDate.value) {
    return 'Pilih tanggal mulai dan tanggal selesai sewa.'
  }
  if (startDate.value < todayIso) {
    return 'Tanggal mulai tidak boleh sebelum hari ini.'
  }
  if (endDate.value < startDate.value) {
    return 'Tanggal selesai harus sama atau setelah tanggal mulai.'
  }
  const state = selectedSizeState.value
  const colorSuffix = activeColor.value ? ` warna ${activeColor.value}` : ''
  if (state && !state.inStockForColor) {
    return `Ukuran ${state.size}${colorSuffix} sedang kosong/habis. Pilih ukuran atau warna lain yang tersedia.`
  }
  if (state?.conflict) {
    if (state.conflictKind === 'buffer') {
      return `Ukuran ${state.size}${colorSuffix} masuk masa jeda dry-clean & persiapan (1–2 hari sebelum/sesudah jadwal ${formatDate(state.conflict.startDate)} – ${formatDate(state.conflict.endDate)}). Pilih tanggal lain di kalender.`
    }
    return `Ukuran ${state.size}${colorSuffix} sudah terpesan (${formatDate(state.conflict.startDate)} – ${formatDate(state.conflict.endDate)}). Pilih ukuran, warna, atau tanggal lain di kalender.`
  }
  return ''
})

const canSubmit = computed(() => {
  return (
    !isSubmitting.value
    && !dateValidationError.value
    && durationDays.value > 0
    && Boolean(paymentMethod.value)
    && renterName.value.trim().length >= 2
    && renterPhone.value.trim().length >= 8
    && guaranteeNumber.value.trim().length >= 4
  )
})

async function copyAccountNumber() {
  if (!import.meta.client || !activePaymentInfo.value) return
  try {
    await navigator.clipboard.writeText(activePaymentInfo.value.account)
    copiedAccount.value = true
    setTimeout(() => {
      copiedAccount.value = false
    }, 2000)
  }
  catch {
    // ignore clipboard errors
  }
}

async function handleBookingSubmit() {
  if (!canSubmit.value || !paymentMethod.value) {
    submitError.value = dateValidationError.value || 'Mohon lengkapi data penyewa, nomor kartu jaminan, dan pilih metode pembayaran.'
    return
  }

  isSubmitting.value = true
  submitError.value = ''

  try {
    const booking = await $fetch<BookingRecord>('/api/bookings', {
      method: 'POST',
      body: {
        itemId: props.item.id,
        selectedSize: selectedSize.value,
        selectedColor: activeColor.value || undefined,
        startDate: startDate.value,
        endDate: endDate.value,
        deliveryOption: deliveryOption.value,
        paymentMethod: paymentMethod.value,
        guaranteeType: guaranteeType.value,
        guaranteeNumber: guaranteeNumber.value.trim(),
        renterName: renterName.value.trim(),
        renterPhone: renterPhone.value.trim(),
        notes: notes.value.trim() || undefined,
      },
    })

    createdBooking.value = booking
    guaranteeNumber.value = ''
    await refreshNuxtData('nav-bookings')
    emit('booked', booking)

    if (booking.paymentMethod === 'cash') {
      toast.push('Pengajuan Sewa Berhasil!', {
        description: `Kode ${booking.id} tercatat. Pembayaran Cash & penyerahan jaminan saat ambil busana.`,
        type: 'success',
      })
    }
    else {
      // Instant 1-click QRIS direct payment for all transfer / e-wallet / QRIS methods (no scanning needed!)
      await new Promise(resolve => setTimeout(resolve, 400))
      const channelLabel = booking.paymentMethod === 'qris'
        ? selectedQrisChannel.value
        : `QRIS ${PAYMENT_ACCOUNTS[booking.paymentMethod]?.label || 'Transfer'}`
      const paidBooking = await $fetch<BookingRecord>(`/api/bookings/${booking.id}/pay`, {
        method: 'POST',
        body: {
          paymentMethod: booking.paymentMethod,
          paymentChannel: channelLabel,
        },
      })
      createdBooking.value = paidBooking
      activeModalBooking.value = paidBooking
      await refreshNuxtData('nav-bookings')
      emit('booked', paidBooking)

      toast.push('Pembayaran QRIS Berhasil!', {
        description: `Lunas via ${channelLabel} — Ref ${paidBooking.paymentReference}.`,
        type: 'success',
      })
    }
  }
  catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    const message
      = fetchErr?.data?.statusMessage
        || fetchErr?.statusMessage
        || fetchErr?.message
        || 'Gagal memproses penyewaan. Silakan coba lagi.'
    submitError.value = message
    toast.push('Gagal Mengajukan Sewa', {
      description: message,
      type: 'error',
    })
  }
  finally {
    isSubmitting.value = false
  }
}

function handlePaid(updated: BookingRecord) {
  createdBooking.value = updated
  activeModalBooking.value = updated
}
</script>

<template>
  <div class="rounded-2xl border border-[#E8E3DC] bg-white p-5 shadow-sm lg:sticky lg:top-24 sm:p-6">
    <!-- Price Header -->
    <div class="flex items-start justify-between gap-3 border-b border-[#EFECE7] pb-4">
      <div>
        <p class="text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
          Harga Sewa
        </p>
        <div class="mt-0.5 flex items-baseline gap-1">
          <span class="font-serif text-2xl font-medium tracking-tight text-[#2B2A28]">
            {{ formatRupiah(props.item.pricePerDay) }}
          </span>
          <span class="text-xs text-[#8A837A]">/hari</span>
        </div>
      </div>

      <span
        class="rounded-full px-3 py-1 text-[11px] font-medium text-white"
        :class="props.item.status === 'Tersedia' ? 'bg-[#6F7F6C]' : 'bg-[#9E7B6B]'"
      >
        {{ props.item.status }}
      </span>
    </div>

    <!-- Success Panel -->
    <div
      v-if="createdBooking"
      class="mt-5 rounded-xl border border-[#C7D1C5] bg-[#F3F5F2] p-4"
    >
      <div class="flex items-start gap-3">
        <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-[#556256]" />
        <div class="min-w-0 flex-1">
          <h3 class="font-serif text-base font-medium text-[#2B2A28]">
            Booking Berhasil Diajukan!
          </h3>
          <p class="mt-1 text-xs leading-relaxed text-[#556256]">
            Kode Booking: <strong class="text-[#2B2A28]">{{ createdBooking.id }}</strong><br>
            Ukuran: <strong class="text-[#2B2A28]">{{ createdBooking.selectedSize }}</strong><br>
            Jadwal: {{ formatDate(createdBooking.startDate) }} – {{ formatDate(createdBooking.endDate) }} ({{ createdBooking.durationDays }} hari)<br>
            Total: <strong class="text-[#2B2A28]">{{ formatRupiah(createdBooking.totalPrice) }}</strong><br>
            Pembayaran:
            <strong class="text-[#2B2A28]">
              {{
                createdBooking.paymentStatus === 'terverifikasi'
                  ? `Lunas (${createdBooking.paymentReference || 'Terverifikasi'})`
                  : createdBooking.paymentMethod === 'cash'
                    ? 'Cash / Tunai (Bayar di Tempat)'
                    : 'Menunggu Pembayaran'
              }}
            </strong><br>
            Jaminan Sewa:
            <strong class="text-[#2B2A28]">
              {{ GUARANTEE_OPTIONS[createdBooking.guaranteeType]?.label }}
              <template v-if="createdBooking.guaranteeNumber"> ({{ createdBooking.guaranteeNumber }})</template>
            </strong>
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#556256] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#455146]"
              @click="activeModalBooking = createdBooking"
            >
              <CreditCard v-if="createdBooking.paymentStatus === 'belum_bayar'" class="h-3.5 w-3.5" />
              <ReceiptText v-else class="h-3.5 w-3.5" />
              {{ createdBooking.paymentStatus === 'belum_bayar' ? 'Bayar Sekarang' : 'Lihat Struk Bukti Bayar' }}
            </button>
            <NuxtLink
              to="/dashboard"
              class="inline-flex items-center justify-center rounded-md bg-[#2B2A28] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3F3D39]"
            >
              Lihat di Penyewaan Saya
            </NuxtLink>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md border border-[#C7D1C5] bg-white px-4 py-2 text-xs font-medium text-[#2B2A28] transition-colors hover:bg-[#FAF8F5]"
              @click="createdBooking = null"
            >
              Sewa Jadwal Lain
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Calculator Form -->
    <form v-else class="mt-5 space-y-4" @submit.prevent="handleBookingSubmit">
      <!-- Active booked dates alert (scoped to active color) -->
      <div
        v-if="relevantBookedRanges.length > 0"
        class="rounded-xl border border-[#E3CFC8] bg-[#FAF4F1] p-3 text-xs text-[#6B4F45]"
      >
        <p class="flex items-center gap-1.5 font-semibold">
          <Calendar class="h-3.5 w-3.5 text-[#9E7B6B]" />
          Jadwal Terpesan{{ activeColor ? ` (${activeColor})` : '' }}:
        </p>
        <ul class="mt-1 list-disc space-y-0.5 pl-5">
          <li v-for="range in relevantBookedRanges" :key="range.bookingId">
            <strong v-if="range.selectedSize">Size {{ range.selectedSize }}</strong>
            <template v-if="range.selectedSize"> &bull; </template>
            {{ formatDate(range.startDate) }} – {{ formatDate(range.endDate) }}
          </li>
        </ul>
      </div>

      <!-- Color Selector (synced with gallery photo & real-time per-color size stock) -->
      <div v-if="availableColors.length > 0">
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
            Pilih Warna ({{ availableColors.length }})
          </span>
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-semibold text-[#2B2A28]">
              {{ activeColor }}
            </span>
            <RefreshCw
              v-if="props.isRefreshingStock"
              class="h-3 w-3 animate-spin text-[#556256]"
              title="Memperbarui stok..."
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <button
            v-for="color in availableColors"
            :key="color.name"
            type="button"
            class="flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition-all"
            :class="
              activeColor === color.name
                ? 'border-[#2B2A28] bg-[#2B2A28] text-white shadow-sm'
                : getColorStockSummary(color.name).ready === 0
                  ? 'border-dashed border-[#E2DCD3] bg-[#FAF8F5] text-[#9A938A] hover:border-[#C7B8AE]'
                  : 'border-[#E8E3DC] bg-[#FAF8F5] text-[#2B2A28] hover:border-[#556256]'
            "
            @click="activeColor = color.name"
          >
            <span class="flex min-w-0 items-center gap-1.5">
              <span
                class="h-3.5 w-3.5 shrink-0 rounded-full border"
                :class="activeColor === color.name ? 'border-white/70' : 'border-black/20'"
                :style="{ backgroundColor: color.hex }"
              />
              <span class="truncate">{{ color.name }}</span>
            </span>
            <span
              class="shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold"
              :class="
                getColorStockSummary(color.name).ready === 0
                  ? (activeColor === color.name ? 'bg-rose-500/30 text-rose-100' : 'bg-rose-50 text-rose-600')
                  : (activeColor === color.name ? 'bg-white/15 text-white' : 'bg-[#EEF2ED] text-[#556256]')
              "
            >
              {{
                getColorStockSummary(color.name).ready === 0
                  ? 'Penuh'
                  : `${getColorStockSummary(color.name).ready}/${getColorStockSummary(color.name).total}`
              }}
            </span>
          </button>
        </div>
      </div>

      <!-- Size Selector (real-time per-color availability) -->
      <div>
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
              Pilih Ukuran
            </span>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-medium"
              :class="
                activeColorReadyCount > 0
                  ? 'bg-[#EEF2ED] text-[#455146]'
                  : 'bg-rose-50 text-rose-700'
              "
            >
              {{
                activeColor
                  ? `${activeColor}: ${activeColorReadyCount}/${sizeStates.length} ready`
                  : `${activeColorReadyCount}/${sizeStates.length} ready`
              }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[11px] font-medium text-[#556256] underline decoration-[#556256]/40 underline-offset-2 transition-colors hover:text-[#2B2A28] hover:decoration-[#2B2A28]"
            @click="openSizeGuide(props.item.category)"
          >
            <Ruler class="h-3 w-3" />
            Panduan Ukuran
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="sz in sizeStates"
            :key="`${activeColor}-${sz.size}`"
            type="button"
            :disabled="!sz.inStockForColor"
            :title="
              !sz.inStockForColor
                ? `Ukuran ${sz.size} habis untuk warna ${activeColor || 'ini'}`
                : sz.conflictKind === 'buffer' && sz.conflict
                  ? `Masa jeda dry-clean (sebelum/sesudah sewa ${formatDate(sz.conflict.startDate)} – ${formatDate(sz.conflict.endDate)})`
                  : sz.conflict
                    ? `Terpesan ${formatDate(sz.conflict.startDate)} – ${formatDate(sz.conflict.endDate)}`
                    : `Ukuran ${sz.size} tersedia`
            "
            class="relative inline-flex min-w-[52px] items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
            :class="
              !sz.inStockForColor
                ? 'cursor-not-allowed border-dashed border-[#E2DCD3] bg-[#F7F5F2] text-[#B0A89E]'
                : sz.conflictKind === 'buffer'
                  ? (selectedSize === sz.size
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-dashed border-amber-300 bg-amber-50/60 text-amber-800/80 hover:border-amber-400')
                  : sz.conflict
                    ? (selectedSize === sz.size
                        ? 'border-rose-400 bg-rose-50 text-rose-700'
                        : 'border-dashed border-rose-200 bg-rose-50/50 text-rose-600/80 hover:border-rose-300')
                    : (selectedSize === sz.size
                        ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
                        : 'border-[#E8E3DC] bg-[#FAF8F5] text-[#2B2A28] hover:border-[#556256]')
            "
            @click="selectedSize = sz.size"
          >
            <span :class="{ 'line-through': !sz.available }">{{ sz.size }}</span>
            <span
              v-if="!sz.available"
              class="text-[9px] font-semibold uppercase"
              :class="!sz.inStockForColor ? 'text-[#A39C93]' : sz.conflictKind === 'buffer' ? 'text-amber-700' : 'text-rose-600'"
            >
              {{ sz.statusLabel }}
            </span>
          </button>
        </div>
      </div>

      <!-- Interactive Availability Calendar (with disabled booked & dry-clean buffer dates) -->
      <AvailabilityCalendar
        v-model:start-date="startDate"
        v-model:end-date="endDate"
        :min-date="todayIso"
        :booked-ranges="activeVariantBookedRanges"
        :variant-label="calendarVariantLabel"
      />

      <!-- Real-Time Availability Feedback -->
      <div
        v-if="dateValidationError"
        class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700"
      >
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
        <span>{{ dateValidationError }}</span>
      </div>
      <div
        v-else
        class="flex items-center justify-between gap-2 rounded-lg border border-[#D7E0D5] bg-[#F3F5F2] px-3 py-2 text-xs font-medium text-[#556256]"
      >
        <span class="flex items-center gap-2">
          <CheckCircle2 class="h-4 w-4 shrink-0" />
          <span>
            <template v-if="activeColor">Warna {{ activeColor }} &bull; </template>Size {{ selectedSize }} tersedia untuk {{ durationDays }} hari
          </span>
        </span>
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[#556256] hover:bg-white/70"
          title="Perbarui ketersediaan stok sekarang"
          @click="emit('refresh-stock')"
        >
          <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': props.isRefreshingStock }" />
        </button>
      </div>

      <!-- Delivery Method -->
      <div>
        <span class="mb-2 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
          Metode Pengambilan
        </span>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label
            class="flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-all"
            :class="
              deliveryOption === 'ambil_sendiri'
                ? 'border-[#2B2A28] bg-[#FAF8F5]'
                : 'border-[#E8E3DC] bg-white hover:border-[#C7D1C5]'
            "
          >
            <input
              v-model="deliveryOption"
              type="radio"
              value="ambil_sendiri"
              class="mt-0.5 accent-[#2B2A28]"
            >
            <div class="min-w-0">
              <div class="flex items-center gap-1 text-xs font-semibold text-[#2B2A28]">
                <Store class="h-3.5 w-3.5 text-[#556256]" />
                Ambil Sendiri
              </div>
              <p class="mt-0.5 text-[11px] font-medium text-[#556256]">
                Gratis (Rp0)
              </p>
            </div>
          </label>

          <label
            class="flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-all"
            :class="
              deliveryOption === 'kurir_antar'
                ? 'border-[#2B2A28] bg-[#FAF8F5]'
                : 'border-[#E8E3DC] bg-white hover:border-[#C7D1C5]'
            "
          >
            <input
              v-model="deliveryOption"
              type="radio"
              value="kurir_antar"
              class="mt-0.5 accent-[#2B2A28]"
            >
            <div class="min-w-0">
              <div class="flex items-center gap-1 text-xs font-semibold text-[#2B2A28]">
                <Truck class="h-3.5 w-3.5 text-[#556256]" />
                Kurir Antar
              </div>
              <p class="mt-0.5 text-[11px] text-[#6B655E]">
                {{ formatRupiah(DELIVERY_FEE_COURIER) }}
              </p>
            </div>
          </label>
        </div>
      </div>

      <!-- Renter Info -->
      <div class="grid grid-cols-1 gap-3 border-t border-[#EFECE7] pt-4 sm:grid-cols-2">
        <div>
          <label for="renter-name" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
            Nama Penyewa
          </label>
          <input
            id="renter-name"
            v-model="renterName"
            type="text"
            required
            placeholder="Nama lengkap"
            class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3 py-2 text-xs text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
          >
        </div>
        <div>
          <label for="renter-phone" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
            No. WhatsApp
          </label>
          <input
            id="renter-phone"
            v-model="renterPhone"
            type="tel"
            required
            placeholder="0812-xxxx-xxxx"
            class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3 py-2 text-xs text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
          >
        </div>
      </div>

      <div>
        <label for="renter-notes" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
          Catatan Acara / Fitting <span class="normal-case text-[#A39C93]">(Opsional)</span>
        </label>
        <input
          id="renter-notes"
          v-model="notes"
          type="text"
          placeholder="Contoh: Untuk wisuda hari Sabtu, TB 162cm BB 52kg"
          class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3 py-2 text-xs text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
        >
      </div>

      <!-- Jaminan Sewa (Identitas) -->
      <div class="space-y-3 border-t border-[#EFECE7] pt-4">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
            <IdCard class="h-3.5 w-3.5 text-[#556256]" />
            Jaminan Sewa (Wajib)
          </div>
          <span class="rounded bg-[#E3E8E2] px-1.5 py-0.5 text-[10px] font-medium text-[#455146]">
            Kembali 100%
          </span>
        </div>

        <div class="grid grid-cols-2 gap-1.5">
          <button
            v-for="[key, opt] in guaranteeOptions"
            :key="key"
            type="button"
            class="rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition-all"
            :class="
              guaranteeType === key
                ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
                : 'border-[#E8E3DC] bg-[#FAF8F5] text-[#6B655E] hover:border-[#556256] hover:text-[#2B2A28]'
            "
            @click="guaranteeType = key"
          >
            {{ opt.label }}
          </button>
        </div>

        <p class="text-[11px] leading-relaxed text-[#6B655E]">
          {{ activeGuaranteeInfo.description }}
        </p>

        <div>
          <label for="guarantee-number" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
            No. Identitas / Nama di Kartu <span class="text-rose-500">*</span>
          </label>
          <input
            id="guarantee-number"
            v-model="guaranteeNumber"
            type="text"
            required
            placeholder="Contoh: 3174-xxxx-0012 atau NIM / No. SIM"
            class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3 py-2 text-xs text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
          >
          <p class="mt-1 text-[10px] text-[#8A837A]">
            Kartu identitas asli dititipkan langsung saat pengambilan busana &amp; dikembalikan utuh saat pengembalian.
          </p>
        </div>
      </div>

      <!-- Payment Method (Direct Checkout, No Photo Upload) -->
      <div class="space-y-3 border-t border-[#EFECE7] pt-4">
        <div class="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
          <CreditCard class="h-3.5 w-3.5 text-[#556256]" />
          Metode Pembayaran
        </div>

        <div class="grid grid-cols-2 gap-1.5">
          <button
            v-for="[key, info] in paymentMethods"
            :key="key"
            type="button"
            class="flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition-all"
            :class="[
              key === 'cash' ? 'col-span-2 justify-center' : '',
              paymentMethod === key
                ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
                : 'border-[#E8E3DC] bg-[#FAF8F5] text-[#6B655E] hover:border-[#556256] hover:text-[#2B2A28]',
            ]"
            @click="paymentMethod = key"
          >
            <Banknote v-if="key === 'cash'" class="h-3.5 w-3.5 shrink-0" />
            <span>{{ info.label }}</span>
          </button>
        </div>

        <!-- Prompt before selecting a payment method -->
        <p
          v-if="!paymentMethod"
          class="rounded-xl border border-dashed border-[#D9D2C8] bg-[#FAF8F5] px-3.5 py-3 text-center text-[11px] text-[#8A837A]"
        >
          Pilih salah satu metode pembayaran di atas terlebih dahulu.
        </p>

        <!-- Cash Payment Info Box -->
        <div
          v-else-if="isCashPayment && activePaymentInfo"
          class="flex items-start gap-2.5 rounded-xl border border-[#C7D1C5] bg-[#F3F5F2] px-3.5 py-3"
        >
          <Banknote class="mt-0.5 h-4 w-4 shrink-0 text-[#556256]" />
          <div class="min-w-0">
            <p class="text-xs font-semibold text-[#2B2A28]">
              {{ activePaymentInfo.account }}
            </p>
            <p class="mt-0.5 text-[11px] leading-relaxed text-[#556256]">
              {{ activePaymentInfo.holder }}. Siapkan uang tunai &amp; kartu jaminan asli saat pengambilan.
            </p>
          </div>
        </div>

        <!-- QRIS Instant Direct Pay Card (Appears ONLY after user chooses QRIS) -->
        <div v-else-if="paymentMethod === 'qris'" class="space-y-2.5">
          <QrisCard
            :amount="totalPrice"
            :reference-id="props.item.id.toUpperCase().slice(0, 12)"
            compact
          />
          <div class="rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] p-2.5">
            <p class="mb-1.5 text-[10.5px] font-semibold text-[#2B2A28]">
              Pilih Sumber Dana QRIS (Langsung Bayar):
            </p>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                v-for="ch in qrisChannels"
                :key="ch"
                type="button"
                class="rounded-md border px-2 py-1.5 text-[10.5px] font-medium transition-colors"
                :class="
                  selectedQrisChannel === ch
                    ? 'border-[#556256] bg-[#556256] text-white'
                    : 'border-[#E8E3DC] bg-white text-[#6B655E] hover:border-[#556256] hover:text-[#2B2A28]'
                "
                @click="selectedQrisChannel = ch"
              >
                {{ ch }}
              </button>
            </div>
          </div>
        </div>

        <!-- Transfer / E-Wallet Account Info + Instant Fake QRIS (Appears after selecting transfer method) -->
        <div
          v-else-if="activePaymentInfo"
          class="space-y-2.5"
        >
          <div class="flex items-center justify-between gap-2 rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold text-[#2B2A28]">
                {{ activePaymentInfo.account }}
              </p>
              <p class="truncate text-[10px] text-[#8A837A]">
                {{ activePaymentInfo.holder }}
              </p>
            </div>
            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#E8E3DC] bg-white px-2.5 py-1 text-[10px] font-medium text-[#2B2A28] hover:border-[#2B2A28]"
              @click="copyAccountNumber"
            >
              <Check v-if="copiedAccount" class="h-3 w-3 text-[#556256]" />
              <Copy v-else class="h-3 w-3" />
              {{ copiedAccount ? 'Tersalin' : 'Salin' }}
            </button>
          </div>

          <QrisCard
            compact
            :amount="totalPrice"
            :reference-id="props.item.id.toUpperCase().slice(0, 12)"
            :title="`SERUNI ATELIER • ${activePaymentInfo.label}`"
            :subtitle="activePaymentInfo.account"
            badge-text="Langsung Bayar (Tanpa Scan)"
            hint-text="Tidak perlu scan kamera — klik tombol bayar di bawah untuk langsung lunas via QRIS."
          />
        </div>
      </div>

      <!-- Real-Time Breakdown -->
      <div class="space-y-2.5 rounded-xl bg-[#FAF8F5] p-4 text-xs">
        <div class="flex items-center justify-between text-[#6B655E]">
          <span>{{ formatRupiah(props.item.pricePerDay) }} &times; {{ durationDays }} hari</span>
          <span class="font-medium text-[#2B2A28]">{{ formatRupiah(subtotal) }}</span>
        </div>

        <div class="flex items-center justify-between text-[#6B655E]">
          <span class="inline-flex items-center gap-1">
            <Sparkles class="h-3.5 w-3.5 text-[#556256]" />
            Laundry Dry-Clean
          </span>
          <span class="font-medium text-[#556256]">Termasuk</span>
        </div>

        <div class="flex items-center justify-between text-[#6B655E]">
          <span class="inline-flex items-center gap-1.5">
            Deposit Keamanan
            <span class="rounded bg-[#E3E8E2] px-1.5 py-0.5 text-[10px] font-medium text-[#455146]">
              Refundable
            </span>
          </span>
          <span class="font-medium text-[#2B2A28]">{{ formatRupiah(props.item.deposit) }}</span>
        </div>

        <div class="flex items-center justify-between text-[#6B655E]">
          <span>{{ deliveryOption === 'kurir_antar' ? 'Biaya Kurir Antar' : 'Ambil Sendiri' }}</span>
          <span class="font-medium" :class="deliveryFee === 0 ? 'text-[#556256]' : 'text-[#2B2A28]'">
            {{ deliveryFee === 0 ? 'Gratis' : formatRupiah(deliveryFee) }}
          </span>
        </div>

        <div class="flex items-center justify-between border-t border-[#E8E3DC] pt-3">
          <span class="text-sm font-semibold text-[#2B2A28]">Total Pembayaran</span>
          <span class="font-serif text-lg font-medium text-[#2B2A28]">
            {{ formatRupiah(totalPrice) }}
          </span>
        </div>
      </div>

      <!-- API Error -->
      <p
        v-if="submitError"
        class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
      >
        {{ submitError }}
      </p>

      <!-- Submit Button (Requires Login) -->
      <button
        v-if="isLoggedIn"
        type="submit"
        :disabled="!canSubmit"
        class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2B2A28] px-5 py-3 text-xs font-medium tracking-wide text-white transition-all hover:bg-[#3F3D39] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#C9C3BA]"
      >
        <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
        <span>
          {{
            isSubmitting
              ? !isCashPayment
                ? 'Memproses Pembayaran QRIS...'
                : 'Memproses Pengajuan...'
              : !paymentMethod
                ? 'Pilih Metode Pembayaran'
                : isCashPayment
                  ? 'Ajukan Sewa (Bayar Cash)'
                  : `Bayar Langsung via QRIS — ${formatRupiah(totalPrice)}`
          }}
        </span>
      </button>
      <NuxtLink
        v-else
        :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`"
        class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2B2A28] px-5 py-3 text-xs font-medium tracking-wide text-white transition-all hover:bg-[#3F3D39]"
      >
        Masuk untuk Ajukan Sewa
      </NuxtLink>

      <p class="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#8A837A]">
        <Shield class="h-3.5 w-3.5 shrink-0 text-[#556256]" />
        <span>
          Deposit {{ formatRupiah(props.item.deposit) }} kembali 100% sesuai
          <button
            type="button"
            class="font-semibold text-[#556256] underline underline-offset-2 hover:text-[#2B2A28]"
            @click="showTermsModal = true"
          >
            Cara Sewa &amp; S&amp;K
          </button>.
        </span>
      </p>
    </form>

    <!-- Interactive Payment Checkout & Receipt Modal -->
    <PaymentModal
      :booking="activeModalBooking"
      @close="activeModalBooking = null"
      @paid="handlePaid"
    />

    <!-- Quick Cara Sewa & S&K Modal -->
    <TermsModal
      :open="showTermsModal"
      @close="showTermsModal = false"
    />
  </div>
</template>
