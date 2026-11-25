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
  Shield,
  Sparkles,
  Store,
  Truck,
} from 'lucide-vue-next'
import {
  DELIVERY_FEE_COURIER,
  GUARANTEE_OPTIONS,
  PAYMENT_ACCOUNTS,
  type BookingRecord,
  type DeliveryOption,
  type GuaranteeType,
  type PaymentMethod,
  type RentalItemDetail,
} from '#shared/types/rental'

const props = defineProps<{
  item: RentalItemDetail
  selectedColor?: string
}>()

const emit = defineEmits<{
  booked: [booking: BookingRecord]
  'update:selectedColor': [color: string]
}>()

const route = useRoute()
const { user, isLoggedIn } = useAuth()
const { filters } = useCatalogFilters()
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

const availableSizes = computed(() =>
  props.item.sizes?.length ? props.item.sizes : ['All Size'],
)
const availableColors = computed(() => props.item.colors ?? [])
const activeColor = computed({
  get: () => props.selectedColor || availableColors.value[0]?.name || '',
  set: (val: string) => emit('update:selectedColor', val),
})

const selectedSize = ref(availableSizes.value[0] ?? 'All Size')
const startDate = ref(defaultStart.value)
const endDate = ref(defaultEnd.value)
const deliveryOption = ref<DeliveryOption>('ambil_sendiri')
const paymentMethod = ref<PaymentMethod | ''>('')
const selectedQrisChannel = ref('BCA Mobile')
const activeModalBooking = ref<BookingRecord | null>(null)
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

watch(availableSizes, (sizes) => {
  if (!sizes.includes(selectedSize.value)) {
    selectedSize.value = sizes[0] ?? 'All Size'
  }
})

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
  const conflict = props.item.bookedRanges.find(
    range => startDate.value <= range.endDate && range.startDate <= endDate.value,
  )
  if (conflict) {
    return `Tanggal bentrok dengan jadwal sewa aktif (${formatDate(conflict.startDate)} – ${formatDate(conflict.endDate)}). Pilih tanggal lain.`
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
      <!-- Active booked dates alert -->
      <div
        v-if="props.item.bookedRanges.length > 0"
        class="rounded-xl border border-[#E3CFC8] bg-[#FAF4F1] p-3 text-xs text-[#6B4F45]"
      >
        <p class="flex items-center gap-1.5 font-semibold">
          <Calendar class="h-3.5 w-3.5 text-[#9E7B6B]" />
          Jadwal Terpesan Saat Ini:
        </p>
        <ul class="mt-1 list-disc space-y-0.5 pl-5">
          <li v-for="range in props.item.bookedRanges" :key="range.bookingId">
            {{ formatDate(range.startDate) }} – {{ formatDate(range.endDate) }}
          </li>
        </ul>
      </div>

      <!-- Color Selector (when model has multiple colors) -->
      <div v-if="availableColors.length > 0">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
            Pilih Warna
          </span>
          <span class="text-xs font-semibold text-[#2B2A28]">
            {{ activeColor }}
          </span>
        </div>
        <div class="grid grid-cols-3 gap-1.5">
          <button
            v-for="color in availableColors"
            :key="color.name"
            type="button"
            class="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition-all"
            :class="
              activeColor === color.name
                ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
                : 'border-[#E8E3DC] bg-[#FAF8F5] text-[#2B2A28] hover:border-[#556256]'
            "
            @click="activeColor = color.name"
          >
            <span
              class="h-3.5 w-3.5 shrink-0 rounded-full border"
              :class="activeColor === color.name ? 'border-white/70' : 'border-black/20'"
              :style="{ backgroundColor: color.hex }"
            />
            <span class="truncate">{{ color.name }}</span>
          </button>
        </div>
      </div>

      <!-- Size Selector -->
      <div>
        <span class="mb-2 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
          Pilih Ukuran
        </span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="size in availableSizes"
            :key="size"
            type="button"
            class="min-w-[46px] rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
            :class="
              selectedSize === size
                ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
                : 'border-[#E8E3DC] bg-[#FAF8F5] text-[#2B2A28] hover:border-[#556256]'
            "
            @click="selectedSize = size"
          >
            {{ size }}
          </button>
        </div>
      </div>

      <!-- Date Pickers -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="calc-start" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
            Tanggal Mulai
          </label>
          <input
            id="calc-start"
            v-model="startDate"
            type="date"
            :min="todayIso"
            required
            class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
          >
        </div>
        <div>
          <label for="calc-end" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
            Tanggal Selesai
          </label>
          <input
            id="calc-end"
            v-model="endDate"
            type="date"
            :min="startDate || todayIso"
            required
            class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
          >
        </div>
      </div>

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
        class="flex items-center gap-2 rounded-lg border border-[#D7E0D5] bg-[#F3F5F2] px-3 py-2 text-xs font-medium text-[#556256]"
      >
        <CheckCircle2 class="h-4 w-4 shrink-0" />
        <span>Size {{ selectedSize }} tersedia untuk {{ durationDays }} hari</span>
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
        <Shield class="h-3.5 w-3.5 text-[#556256]" />
        Deposit {{ formatRupiah(props.item.deposit) }} &amp; kartu jaminan kembali 100% saat pengembalian.
      </p>
    </form>

    <!-- Interactive Payment Checkout & Receipt Modal -->
    <PaymentModal
      :booking="activeModalBooking"
      @close="activeModalBooking = null"
      @paid="handlePaid"
    />
  </div>
</template>
