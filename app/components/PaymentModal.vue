<script setup lang="ts">
import {
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  Printer,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-vue-next'
import {
  GUARANTEE_OPTIONS,
  PAYMENT_ACCOUNTS,
  type BookingRecord,
  type PaymentMethod,
} from '#shared/types/rental'

const props = defineProps<{
  booking: BookingRecord | null
}>()

const emit = defineEmits<{
  close: []
  paid: [booking: BookingRecord]
}>()

const { formatRupiah, formatDateRange } = useFormatters()
const toast = useToast()

const selectedMethod = ref<PaymentMethod>('qris')
const selectedQrisChannel = ref('BCA Mobile')
const isPaying = ref(false)
const copiedAccount = ref(false)
const localBooking = ref<BookingRecord | null>(null)

const qrisChannels = [
  'BCA Mobile',
  'Livin\' Mandiri',
  'BRImo',
  'GoPay',
  'DANA',
  'ShopeePay',
]

watch(
  () => props.booking,
  (b) => {
    localBooking.value = b ? { ...b } : null
    if (b) {
      selectedMethod.value = b.paymentMethod || 'qris'
      if (b.paymentChannel) {
        selectedQrisChannel.value = b.paymentChannel
      }
    }
  },
  { immediate: true },
)

const paymentMethods = Object.entries(PAYMENT_ACCOUNTS) as [
  PaymentMethod,
  { label: string, account: string, holder: string, isCash?: boolean },
][]

const activeAccount = computed(() => PAYMENT_ACCOUNTS[selectedMethod.value])
const isUnpaid = computed(() => localBooking.value?.paymentStatus === 'belum_bayar')

function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function copyAccount() {
  if (!import.meta.client) return
  try {
    await navigator.clipboard.writeText(activeAccount.value.account)
    copiedAccount.value = true
    setTimeout(() => {
      copiedAccount.value = false
    }, 2000)
  }
  catch {
    // ignore clipboard error
  }
}

async function processPayment() {
  if (!localBooking.value || isPaying.value) return
  isPaying.value = true

  try {
    // Brief smooth processing delay so the checkout feels authentic
    await new Promise(resolve => setTimeout(resolve, 450))

    const updated = await $fetch<BookingRecord>(`/api/bookings/${localBooking.value.id}/pay`, {
      method: 'POST',
      body: {
        paymentMethod: selectedMethod.value,
        paymentChannel: selectedMethod.value === 'qris' ? selectedQrisChannel.value : undefined,
      },
    })

    localBooking.value = updated
    emit('paid', updated)

    if (updated.paymentStatus === 'terverifikasi') {
      toast.push('Pembayaran Berhasil!', {
        description: `Transaksi ${updated.paymentReference || updated.id} telah lunas.`,
        type: 'success',
      })
    }
    else {
      toast.push('Metode Cash Dipilih', {
        description: `Silakan bayar tunai saat pengambilan/pengantaran untuk ${updated.id}.`,
        type: 'info',
      })
    }
  }
  catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string }, statusMessage?: string }
    toast.push('Gagal Memproses Pembayaran', {
      description: fetchErr?.data?.statusMessage || fetchErr?.statusMessage || 'Silakan coba lagi.',
      type: 'error',
    })
  }
  finally {
    isPaying.value = false
  }
}

function printReceipt() {
  if (import.meta.client) {
    window.print()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="localBooking"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2A28]/70 p-4 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-md overflow-hidden rounded-2xl border border-[#E8E3DC] bg-white shadow-2xl">
        <!-- Header -->
        <div
          class="flex items-center justify-between px-5 py-4 text-white"
          :class="isUnpaid ? 'bg-[#2B2A28]' : 'bg-[#556256]'"
        >
          <div class="flex items-center gap-2.5">
            <CreditCard v-if="isUnpaid" class="h-5 w-5 text-[#E3CFC8]" />
            <CheckCircle2 v-else class="h-5 w-5 text-white" />
            <div>
              <p class="text-[10px] uppercase tracking-widest text-white/75">
                Seruni Atelier Boutique
              </p>
              <h3 class="font-serif text-lg font-medium">
                {{
                  isUnpaid
                    ? 'Transaksi Pembayaran'
                    : localBooking.paymentStatus === 'terverifikasi'
                      ? 'Bukti Pembayaran Lunas'
                      : 'Nota Sewa (Bayar Cash)'
                }}
              </h3>
            </div>
          </div>

          <button
            type="button"
            class="rounded-full p-1 text-white/80 hover:bg-white/15 hover:text-white"
            aria-label="Tutup modal"
            @click="emit('close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- VIEW A: Interactive Payment Checkout (No Photo Upload Needed) -->
        <div v-if="isUnpaid" class="max-h-[72vh] space-y-4 overflow-y-auto p-5 text-xs">
          <!-- Total Banner -->
          <div class="rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] p-4 text-center">
            <p class="text-[10px] font-medium uppercase tracking-wider text-[#8A837A]">
              Total Tagihan ({{ localBooking.id }})
            </p>
            <p class="mt-1 font-serif text-3xl font-semibold tracking-tight text-[#2B2A28]">
              {{ formatRupiah(localBooking.totalPrice) }}
            </p>
            <p class="mt-1 text-[11px] text-[#6B655E]">
              Sudah termasuk deposit refundable {{ formatRupiah(localBooking.deposit) }}
            </p>
          </div>

          <!-- Payment Method Switcher -->
          <div>
            <p class="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
              Pilih Metode Bayar
            </p>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="[key, info] in paymentMethods"
                :key="key"
                type="button"
                class="flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition-all"
                :class="[
                  key === 'cash' ? 'col-span-2 justify-center' : '',
                  selectedMethod === key
                    ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
                    : 'border-[#E8E3DC] bg-[#FAF8F5] text-[#6B655E] hover:border-[#556256] hover:text-[#2B2A28]',
                ]"
                @click="selectedMethod = key"
              >
                <Banknote v-if="key === 'cash'" class="h-3.5 w-3.5 shrink-0" />
                <span>{{ info.label }}</span>
              </button>
            </div>
          </div>

          <!-- QRIS Same-Device Visual + Direct App Selector (No Second Device Scan Needed) -->
          <div v-if="selectedMethod === 'qris'" class="space-y-3">
            <QrisCard
              :amount="localBooking.totalPrice"
              :reference-id="localBooking.id"
            />

            <div class="rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] p-3">
              <p class="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#2B2A28]">
                <Smartphone class="h-3.5 w-3.5 text-[#556256]" />
                Bayar QRIS Langsung di Perangkat Ini via:
              </p>
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  v-for="ch in qrisChannels"
                  :key="ch"
                  type="button"
                  class="rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors"
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

          <!-- Cash Info Display -->
          <div
            v-else-if="selectedMethod === 'cash'"
            class="flex items-start gap-2.5 rounded-xl border border-[#C7D1C5] bg-[#F3F5F2] p-3.5"
          >
            <Banknote class="mt-0.5 h-4 w-4 shrink-0 text-[#556256]" />
            <div>
              <p class="text-xs font-semibold text-[#2B2A28]">
                {{ activeAccount.account }}
              </p>
              <p class="mt-0.5 text-[11px] text-[#556256]">
                {{ activeAccount.holder }}. Konfirmasi pesanan dengan metode Cash dan bayar langsung di lokasi.
              </p>
            </div>
          </div>

          <!-- Virtual Account / Bank / GoPay Display + Instant Fake QRIS -->
          <div v-else class="space-y-3">
            <div class="flex items-center justify-between gap-2 rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] p-3.5">
              <div class="min-w-0">
                <p class="text-[10px] uppercase tracking-wider text-[#8A837A]">
                  {{ activeAccount.label }}
                </p>
                <p class="mt-0.5 font-mono text-sm font-bold text-[#2B2A28]">
                  {{ activeAccount.account }}
                </p>
                <p class="text-[10px] text-[#8A837A]">
                  {{ activeAccount.holder }}
                </p>
              </div>
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#E8E3DC] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#2B2A28] hover:border-[#2B2A28]"
                @click="copyAccount"
              >
                <Check v-if="copiedAccount" class="h-3.5 w-3.5 text-[#556256]" />
                <Copy v-else class="h-3.5 w-3.5" />
                {{ copiedAccount ? 'Tersalin' : 'Salin' }}
              </button>
            </div>

            <QrisCard
              compact
              :amount="localBooking.totalPrice"
              :reference-id="localBooking.id"
              :title="`SERUNI ATELIER • ${activeAccount.label}`"
              :subtitle="`${activeAccount.account} (${activeAccount.holder})`"
              badge-text="QRIS Transfer Simulasi"
              hint-text="Scan atau klik Bayar Sekarang di bawah — pembayaran transfer otomatis terverifikasi lunas."
            />
          </div>

          <p class="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#6B655E]">
            <ShieldCheck class="h-3.5 w-3.5 text-[#556256]" />
            Pembayaran langsung diproses otomatis tanpa scan kamera &amp; tanpa upload foto.
          </p>

          <!-- Pay CTA -->
          <div class="space-y-2 pt-1">
            <button
              type="button"
              :disabled="isPaying"
              class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#556256] px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#455146] disabled:opacity-60"
              @click="processPayment"
            >
              <Loader2 v-if="isPaying" class="h-4 w-4 animate-spin" />
              <CheckCircle2 v-else class="h-4 w-4" />
              <span>
                {{
                  isPaying
                    ? 'Memproses Transaksi Pembayaran...'
                    : selectedMethod === 'cash'
                      ? 'Konfirmasi Bayar Cash di Tempat'
                      : selectedMethod === 'qris'
                        ? `Bayar QRIS via ${selectedQrisChannel} — ${formatRupiah(localBooking.totalPrice)}`
                        : `Bayar Sekarang — ${formatRupiah(localBooking.totalPrice)}`
                }}
              </span>
            </button>
            <button
              type="button"
              class="w-full rounded-lg border border-[#E8E3DC] bg-white px-4 py-2 text-xs font-medium text-[#6B655E] hover:bg-[#FAF8F5] hover:text-[#2B2A28]"
              @click="emit('close')"
            >
              Bayar Nanti di Dashboard
            </button>
          </div>
        </div>

        <!-- VIEW B: Verified Transaction Receipt / Nota -->
        <div v-else>
          <div class="max-h-[68vh] space-y-3.5 overflow-y-auto p-5 text-xs">
            <div class="flex items-center justify-between border-b border-dashed border-[#E8E3DC] pb-3">
              <div>
                <p class="text-[10px] uppercase tracking-wider text-[#8A837A]">
                  {{ localBooking.paymentReference ? 'No. Referensi Transaksi' : 'Kode Booking' }}
                </p>
                <p class="font-mono text-sm font-bold text-[#2B2A28]">
                  {{ localBooking.paymentReference || localBooking.id }}
                </p>
              </div>
              <span
                class="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                :class="
                  localBooking.paymentStatus === 'terverifikasi'
                    ? 'bg-[#E3E8E2] text-[#384239]'
                    : 'bg-[#F6E9D8] text-[#8C5E2A]'
                "
              >
                {{ localBooking.paymentStatus === 'terverifikasi' ? 'LUNAS / BERHASIL' : 'CASH DI TEMPAT' }}
              </span>
            </div>

            <div class="space-y-1.5">
              <div class="flex justify-between gap-3">
                <span class="text-[#8A837A]">Kode Booking</span>
                <span class="font-mono font-medium text-[#2B2A28]">{{ localBooking.id }}</span>
              </div>
              <div v-if="localBooking.paymentPaidAt" class="flex justify-between gap-3">
                <span class="text-[#8A837A]">Waktu Transaksi</span>
                <span class="text-right font-medium text-[#2B2A28]">{{ formatDateTime(localBooking.paymentPaidAt) }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-[#8A837A]">Penyewa</span>
                <span class="text-right font-medium text-[#2B2A28]">{{ localBooking.renterName }} ({{ localBooking.renterPhone }})</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-[#8A837A]">Busana</span>
                <span class="text-right font-medium text-[#2B2A28]">{{ localBooking.itemName }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-[#8A837A]">Ukuran &amp; Jadwal</span>
                <span class="text-right font-medium text-[#2B2A28]">
                  Size {{ localBooking.selectedSize }}
                  <template v-if="localBooking.selectedColor"> &bull; {{ localBooking.selectedColor }}</template>
                  &bull; {{ formatDateRange(localBooking.startDate, localBooking.endDate) }}
                </span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-[#8A837A]">Metode Pembayaran</span>
                <span class="text-right font-medium text-[#2B2A28]">
                  {{ PAYMENT_ACCOUNTS[localBooking.paymentMethod || 'transfer_bca']?.label }}
                  <template v-if="localBooking.paymentChannel"> (via {{ localBooking.paymentChannel }})</template>
                </span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-[#8A837A]">Jaminan Sewa</span>
                <span class="text-right font-medium text-[#2B2A28]">
                  {{ GUARANTEE_OPTIONS[localBooking.guaranteeType || 'ktp']?.label }}
                  <span v-if="localBooking.guaranteeNumber">({{ localBooking.guaranteeNumber }})</span>
                </span>
              </div>
            </div>

            <div class="space-y-1.5 rounded-xl bg-[#FAF8F5] p-3.5">
              <div class="flex justify-between text-[#6B655E]">
                <span>Biaya Sewa ({{ localBooking.durationDays }} hari &times; {{ formatRupiah(localBooking.pricePerDay) }})</span>
                <span class="font-medium text-[#2B2A28]">{{ formatRupiah(localBooking.subtotal) }}</span>
              </div>
              <div class="flex justify-between text-[#6B655E]">
                <span>Deposit Keamanan (Refundable)</span>
                <span class="font-medium text-[#2B2A28]">{{ formatRupiah(localBooking.deposit) }}</span>
              </div>
              <div class="flex justify-between text-[#6B655E]">
                <span>Pengiriman ({{ localBooking.deliveryOption === 'kurir_antar' ? 'Kurir Antar' : 'Ambil Sendiri' }})</span>
                <span class="font-medium text-[#2B2A28]">
                  {{ localBooking.deliveryFee === 0 ? 'Gratis' : formatRupiah(localBooking.deliveryFee) }}
                </span>
              </div>
              <div class="flex justify-between border-t border-[#E8E3DC] pt-2 text-sm">
                <span class="font-semibold text-[#2B2A28]">Total Pembayaran</span>
                <span class="font-serif font-semibold text-[#556256]">{{ formatRupiah(localBooking.totalPrice) }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-[#EFECE7] bg-[#FAF8F5] px-5 py-3">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-md bg-[#2B2A28] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#3F3D39]"
              @click="printReceipt"
            >
              <Printer class="h-3.5 w-3.5" />
              Cetak / Simpan Struk
            </button>
            <button
              type="button"
              class="rounded-md border border-[#E8E3DC] bg-white px-3.5 py-2 text-xs font-medium text-[#2B2A28] hover:bg-[#EFECE7]"
              @click="emit('close')"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
