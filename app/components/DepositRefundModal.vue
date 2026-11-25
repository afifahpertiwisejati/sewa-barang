<script setup lang="ts">
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-vue-next'
import {
  DEPOSIT_REFUND_METHODS,
  type BookingRecord,
  type DepositRefundMethod,
} from '#shared/types/rental'

const props = defineProps<{
  booking: BookingRecord | null
}>()

const emit = defineEmits<{
  close: []
  updated: [booking: BookingRecord]
}>()

const { isAdmin } = useAuth()
const { formatRupiah } = useFormatters()
const toast = useToast()

const methods = Object.entries(DEPOSIT_REFUND_METHODS) as [
  DepositRefundMethod,
  { label: string, placeholder: string, isCash?: boolean },
][]

interface DeductionPreset {
  id: string
  label: string
  amount: number
}

const DEDUCTION_PRESETS: DeductionPreset[] = [
  { id: 'noda', label: 'Noda', amount: 10000 },
  { id: 'aksesoris_hilang', label: 'Aksesoris Hilang', amount: 20000 },
  { id: 'telat_pengembalian', label: 'Telat Pengembalian', amount: 25000 },
  { id: 'rusak_ringan', label: 'Rusak Ringan', amount: 30000 },
  { id: 'rusak_berat', label: 'Rusak Berat', amount: 40000 },
]

const selectedMethod = ref<DepositRefundMethod>('transfer_bca')
const refundAccount = ref('')
const conditionType = ref<'utuh' | 'potongan'>('utuh')
const selectedDeductionKey = ref<string>('noda')
const deductionAmount = ref(0)
const refundNote = ref('')
const completeRental = ref(true)
const submitting = ref(false)
const errorMsg = ref('')

function applyDeductionSelection(key: string) {
  selectedDeductionKey.value = key
  if (key === 'custom') return
  const preset = DEDUCTION_PRESETS.find(p => p.id === key)
  if (!preset || !props.booking) return
  deductionAmount.value = Math.min(props.booking.deposit, preset.amount)
  refundNote.value = `Potongan deposit: ${preset.label} (${formatRupiah(deductionAmount.value)})`
}

function selectConditionPotongan() {
  conditionType.value = 'potongan'
  if (selectedDeductionKey.value !== 'custom') {
    applyDeductionSelection(selectedDeductionKey.value || 'noda')
  }
}

function selectConditionUtuh() {
  conditionType.value = 'utuh'
  deductionAmount.value = 0
  if (refundNote.value.startsWith('Potongan deposit:')) {
    refundNote.value = ''
  }
}

watch(
  () => props.booking,
  (b) => {
    if (!b) return
    errorMsg.value = ''
    selectedMethod.value = b.depositRefundMethod || (b.paymentMethod === 'cash' ? 'cash' : 'transfer_bca')
    refundAccount.value = b.depositRefundAccount && !b.depositRefundAccount.includes('Butik')
      ? b.depositRefundAccount
      : ''
    conditionType.value = (b.depositDeduction ?? 0) > 0 ? 'potongan' : 'utuh'
    const matchedPreset = DEDUCTION_PRESETS.find(p => p.amount === b.depositDeduction)
    selectedDeductionKey.value = matchedPreset ? matchedPreset.id : ((b.depositDeduction ?? 0) > 0 ? 'custom' : 'noda')
    deductionAmount.value = b.depositDeduction ?? 0
    refundNote.value = b.depositRefundNote || ''
    completeRental.value = b.status === 'aktif'
  },
  { immediate: true },
)

const activeMethodInfo = computed(() => DEPOSIT_REFUND_METHODS[selectedMethod.value])
const isCashMethod = computed(() => Boolean(activeMethodInfo.value?.isCash))
const isAlreadyRefunded = computed(
  () => props.booking?.depositStatus === 'dikembalikan' || props.booking?.depositStatus === 'dipotong',
)

const effectiveDeduction = computed(() => {
  if (!props.booking || conditionType.value === 'utuh') return 0
  const val = Number(deductionAmount.value)
  if (!Number.isFinite(val) || val < 0) return 0
  return Math.min(props.booking.deposit, Math.round(val))
})

const finalRefundAmount = computed(() => {
  if (!props.booking) return 0
  return Math.max(0, props.booking.deposit - effectiveDeduction.value)
})

function formatTimestamp(iso?: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function handleSubmit(action: 'request' | 'process') {
  if (!props.booking) return
  errorMsg.value = ''

  if (!isCashMethod.value && refundAccount.value.trim().length < 5) {
    errorMsg.value = 'Mohon isi nomor rekening / e-wallet dan nama pemilik rekening tujuan pengembalian.'
    return
  }

  submitting.value = true
  try {
    const updated = await $fetch<BookingRecord>(`/api/bookings/${props.booking.id}/refund-deposit`, {
      method: 'POST',
      body: {
        action,
        depositRefundMethod: selectedMethod.value,
        depositRefundAccount: isCashMethod.value ? 'Tunai di Butik Seruni Atelier' : refundAccount.value.trim(),
        depositDeduction: action === 'process' ? effectiveDeduction.value : 0,
        depositRefundNote: refundNote.value.trim() || undefined,
        completeRental: action === 'process' ? completeRental.value : false,
      },
    })

    await refreshNuxtData('nav-bookings')
    emit('updated', updated)

    if (action === 'process') {
      toast.push('Pengembalian Deposit Berhasil!', {
        description: `Ref ${updated.depositRefundReference} — ${formatRupiah(updated.depositRefundAmount ?? 0)} telah dikembalikan.`,
        type: 'success',
      })
    }
    else {
      toast.push('Pengajuan Pengembalian Deposit Terkirim', {
        description: 'Data rekening tujuan Anda tersimpan. Admin Butik akan segera memproses pengembalian deposit.',
        type: 'success',
      })
    }
  }
  catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string }, statusMessage?: string }
    errorMsg.value = fetchErr?.data?.statusMessage || fetchErr?.statusMessage || 'Gagal memproses pengembalian deposit.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="props.booking"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2A28]/55 p-4 backdrop-blur-xs"
        @click.self="emit('close')"
      >
        <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E8E3DC] bg-white shadow-xl">
          <!-- Header -->
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-[#EFECE7] bg-white px-5 py-4">
            <div class="flex items-center gap-2.5">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F5F2] text-[#556256]">
                <RotateCcw class="h-4 w-4" />
              </div>
              <div>
                <h2 class="font-serif text-lg font-medium text-[#2B2A28]">
                  {{
                    isAlreadyRefunded
                      ? 'Bukti Pengembalian Deposit'
                      : isAdmin
                        ? 'Proses Pengembalian Deposit'
                        : 'Ajukan Pengembalian Deposit'
                  }}
                </h2>
                <p class="font-mono text-[11px] text-[#8A837A]">
                  {{ props.booking.id }} &bull; {{ props.booking.renterName }}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="rounded-full p-1.5 text-[#8A837A] hover:bg-[#FAF8F5] hover:text-[#2B2A28]"
              @click="emit('close')"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Body -->
          <div class="space-y-4 p-5">
            <!-- Item & Deposit Summary -->
            <div class="flex items-center justify-between gap-3 rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] p-3.5">
              <div class="min-w-0">
                <p class="truncate text-xs font-semibold text-[#2B2A28]">
                  {{ props.booking.itemName }}
                </p>
                <p class="mt-0.5 text-[11px] text-[#8A837A]">
                  Deposit Keamanan (Refundable)
                </p>
              </div>
              <p class="shrink-0 font-serif text-lg font-medium text-[#556256]">
                {{ formatRupiah(props.booking.deposit) }}
              </p>
            </div>

            <!-- STATE 1: Already Refunded (Receipt View) -->
            <template v-if="isAlreadyRefunded">
              <div class="rounded-xl border border-[#C7D1C5] bg-[#F3F5F2] p-4 text-xs">
                <div class="flex items-center gap-2 font-semibold text-[#384239]">
                  <CheckCircle2 class="h-4 w-4 text-[#556256]" />
                  <span>
                    {{
                      props.booking.depositStatus === 'dipotong'
                        ? 'Deposit Dikembalikan (Dengan Potongan)'
                        : 'Deposit Berhasil Dikembalikan 100%'
                    }}
                  </span>
                </div>

                <dl class="mt-3 space-y-2 border-t border-[#D7E0D5] pt-3">
                  <div class="flex justify-between gap-2">
                    <dt class="text-[#6B655E]">No. Referensi Refund</dt>
                    <dd class="font-mono font-semibold text-[#2B2A28]">
                      {{ props.booking.depositRefundReference || '-' }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-2">
                    <dt class="text-[#6B655E]">Waktu Pengembalian</dt>
                    <dd class="font-medium text-[#2B2A28]">
                      {{ formatTimestamp(props.booking.depositRefundedAt) }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-2">
                    <dt class="text-[#6B655E]">Metode Pengembalian</dt>
                    <dd class="font-medium text-[#2B2A28]">
                      {{ DEPOSIT_REFUND_METHODS[props.booking.depositRefundMethod || 'cash']?.label }}
                    </dd>
                  </div>
                  <div v-if="props.booking.depositRefundAccount" class="flex justify-between gap-2">
                    <dt class="text-[#6B655E]">Tujuan</dt>
                    <dd class="text-right font-medium text-[#2B2A28]">
                      {{ props.booking.depositRefundAccount }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-2 border-t border-[#D7E0D5] pt-2">
                    <dt class="text-[#6B655E]">Deposit Awal</dt>
                    <dd class="font-medium text-[#2B2A28]">
                      {{ formatRupiah(props.booking.deposit) }}
                    </dd>
                  </div>
                  <div v-if="(props.booking.depositDeduction ?? 0) > 0" class="flex justify-between gap-2 text-[#9E5245]">
                    <dt>Potongan Denda / Kerusakan</dt>
                    <dd class="font-medium">
                      -{{ formatRupiah(props.booking.depositDeduction ?? 0) }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-2 text-sm font-semibold text-[#2B2A28]">
                    <dt>Total Dikembalikan</dt>
                    <dd class="font-serif text-base text-[#556256]">
                      {{ formatRupiah(props.booking.depositRefundAmount ?? props.booking.deposit) }}
                    </dd>
                  </div>
                </dl>

                <p
                  v-if="props.booking.depositRefundNote"
                  class="mt-3 rounded-lg bg-white/80 px-3 py-2 text-[11px] leading-relaxed text-[#556256]"
                >
                  <strong>Catatan Pemeriksaan:</strong> {{ props.booking.depositRefundNote }}
                </p>
              </div>

              <button
                type="button"
                class="w-full rounded-md bg-[#2B2A28] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#3F3D39]"
                @click="emit('close')"
              >
                Tutup Bukti Pengembalian
              </button>
            </template>

            <!-- STATE 2: Pending / Active Refund Form -->
            <template v-else>
              <!-- Info Banner if User Already Submitted Request -->
              <div
                v-if="props.booking.depositStatus === 'menunggu_pengembalian'"
                class="flex items-start gap-2.5 rounded-xl border border-[#E5D3B3] bg-[#FDF8EF] p-3 text-xs text-[#7D5720]"
              >
                <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p class="font-semibold">
                    {{ isAdmin ? 'Penyewa Menunggu Pengembalian Deposit' : 'Pengajuan Anda Sedang Diproses' }}
                  </p>
                  <p class="mt-0.5 text-[11px] leading-relaxed">
                    {{
                      isAdmin
                        ? 'Periksa kondisi busana saat dikembalikan, lalu konfirmasi pencairan deposit di bawah ini.'
                        : 'Anda dapat memperbarui rekening tujuan di bawah ini sebelum Admin Butik menyelesaikan pencairan.'
                    }}
                  </p>
                </div>
              </div>

              <!-- Refund Method Selection -->
              <div>
                <span class="mb-2 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
                  Metode Pengembalian Deposit
                </span>
                <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  <button
                    v-for="[key, opt] in methods"
                    :key="key"
                    type="button"
                    class="flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-medium transition-all"
                    :class="
                      selectedMethod === key
                        ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
                        : 'border-[#E8E3DC] bg-[#FAF8F5] text-[#6B655E] hover:border-[#556256] hover:text-[#2B2A28]'
                    "
                    @click="selectedMethod = key"
                  >
                    <Banknote v-if="opt.isCash" class="h-3.5 w-3.5 shrink-0" />
                    <CreditCard v-else class="h-3.5 w-3.5 shrink-0" />
                    <span>{{ opt.label }}</span>
                  </button>
                </div>
              </div>

              <!-- Destination Account Input -->
              <div v-if="!isCashMethod">
                <label for="refund-account" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
                  No. Rekening / E-Wallet &amp; Nama Pemilik <span class="text-rose-500">*</span>
                </label>
                <input
                  id="refund-account"
                  v-model="refundAccount"
                  type="text"
                  :placeholder="activeMethodInfo.placeholder"
                  class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3 py-2 text-xs text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
                >
              </div>
              <div
                v-else
                class="rounded-xl border border-[#D7E0D5] bg-[#F3F5F2] px-3.5 py-2.5 text-[11px] text-[#455146]"
              >
                Deposit akan dikembalikan secara <strong>tunai langsung di butik</strong> bersamaan dengan serah-terima busana &amp; kartu jaminan.
              </div>

              <!-- Admin-Only Inspection & Deduction Controls -->
              <div v-if="isAdmin" class="space-y-3 border-t border-[#EFECE7] pt-3">
                <span class="block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
                  Hasil Pemeriksaan Busana (Admin)
                </span>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    class="rounded-xl border p-2.5 text-left text-xs transition-all"
                    :class="
                      conditionType === 'utuh'
                        ? 'border-[#556256] bg-[#F3F5F2] text-[#2B2A28]'
                        : 'border-[#E8E3DC] bg-white text-[#6B655E]'
                    "
                    @click="selectConditionUtuh"
                  >
                    <p class="font-semibold">Kondisi Utuh 100%</p>
                    <p class="mt-0.5 text-[10.5px] text-[#556256]">Tanpa potongan (Rp0)</p>
                  </button>
                  <button
                    type="button"
                    class="rounded-xl border p-2.5 text-left text-xs transition-all"
                    :class="
                      conditionType === 'potongan'
                        ? 'border-[#9E5245] bg-[#FAF4F1] text-[#2B2A28]'
                        : 'border-[#E8E3DC] bg-white text-[#6B655E]'
                    "
                    @click="selectConditionPotongan"
                  >
                    <p class="font-semibold">Ada Potongan</p>
                    <p class="mt-0.5 text-[10.5px] text-[#9E5245]">Noda / hilang / telat / rusak</p>
                  </button>
                </div>

                <div v-if="conditionType === 'potongan'" class="space-y-2.5">
                  <div>
                    <label for="refund-deduction-select" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
                      Nominal Potongan (Maks. {{ formatRupiah(props.booking.deposit) }})
                    </label>
                    <select
                      id="refund-deduction-select"
                      :value="selectedDeductionKey"
                      class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3 py-2.5 text-xs font-medium text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
                      @change="applyDeductionSelection(($event.target as HTMLSelectElement).value)"
                    >
                      <option
                        v-for="preset in DEDUCTION_PRESETS"
                        :key="preset.id"
                        :value="preset.id"
                      >
                        {{ preset.label }} — {{ formatRupiah(preset.amount) }}
                      </option>
                      <option value="custom">
                        Nominal Lainnya (isi manual)
                      </option>
                    </select>
                  </div>

                  <div v-if="selectedDeductionKey === 'custom'">
                    <input
                      id="refund-deduction"
                      v-model.number="deductionAmount"
                      type="number"
                      min="0"
                      :max="props.booking.deposit"
                      step="5000"
                      placeholder="Masukkan nominal potongan (Rp)"
                      class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3 py-2 text-xs text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none"
                    >
                  </div>
                </div>

                <!-- Live Refund Calculation Breakdown -->
                <div class="space-y-1.5 rounded-xl bg-[#FAF8F5] p-3 text-xs">
                  <div class="flex justify-between text-[#6B655E]">
                    <span>Deposit Awal</span>
                    <span class="font-medium text-[#2B2A28]">{{ formatRupiah(props.booking.deposit) }}</span>
                  </div>
                  <div v-if="effectiveDeduction > 0" class="flex justify-between text-[#9E5245]">
                    <span>Potongan</span>
                    <span class="font-medium">-{{ formatRupiah(effectiveDeduction) }}</span>
                  </div>
                  <div class="flex justify-between border-t border-[#E8E3DC] pt-1.5 text-sm font-semibold text-[#2B2A28]">
                    <span>Total Dikembalikan ke Penyewa</span>
                    <span class="font-serif text-base text-[#556256]">{{ formatRupiah(finalRefundAmount) }}</span>
                  </div>
                </div>

                <label v-if="props.booking.status === 'aktif'" class="flex cursor-pointer items-center gap-2 text-xs text-[#2B2A28]">
                  <input v-model="completeRental" type="checkbox" class="accent-[#556256]">
                  <span>Sekaligus tandai sewa <strong>Selesai</strong> &amp; kartu jaminan dikembalikan</span>
                </label>
              </div>

              <!-- Optional Note -->
              <div>
                <label for="refund-note" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
                  Catatan {{ isAdmin ? 'Pemeriksaan / Pengembalian' : 'Tambahan' }} <span class="normal-case text-[#A39C93]">(Opsional)</span>
                </label>
                <input
                  id="refund-note"
                  v-model="refundNote"
                  type="text"
                  :placeholder="isAdmin ? 'Contoh: Kebaya & selendang kembali lengkap dan bersih' : 'Contoh: Mohon transfer ke rekening BCA di atas ya kak'"
                  class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3 py-2 text-xs text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none"
                >
              </div>

              <!-- Error -->
              <p
                v-if="errorMsg"
                class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
              >
                <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
                <span>{{ errorMsg }}</span>
              </p>

              <!-- Action Buttons -->
              <div class="flex flex-col gap-2 pt-1 sm:flex-row">
                <button
                  v-if="isAdmin"
                  type="button"
                  :disabled="submitting"
                  class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#556256] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#455146] disabled:opacity-60"
                  @click="handleSubmit('process')"
                >
                  <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
                  <CheckCircle2 v-else class="h-4 w-4" />
                  <span>Konfirmasi &amp; Kembalikan {{ formatRupiah(finalRefundAmount) }}</span>
                </button>
                <button
                  v-else
                  type="button"
                  :disabled="submitting"
                  class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#2B2A28] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#3F3D39] disabled:opacity-60"
                  @click="handleSubmit('request')"
                >
                  <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
                  <RotateCcw v-else class="h-4 w-4" />
                  <span>
                    {{
                      props.booking.depositStatus === 'menunggu_pengembalian'
                        ? 'Perbarui Rekening Pengembalian'
                        : 'Ajukan Pengembalian Deposit'
                    }}
                  </span>
                </button>
                <button
                  type="button"
                  class="rounded-md border border-[#E8E3DC] bg-white px-4 py-2.5 text-xs font-medium text-[#6B655E] hover:border-[#2B2A28] hover:text-[#2B2A28]"
                  @click="emit('close')"
                >
                  Batal
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
