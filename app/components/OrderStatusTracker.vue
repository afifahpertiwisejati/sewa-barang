<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  CreditCard,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from 'lucide-vue-next'
import {
  resolveBookingStage,
  type BookingRecord,
  type FulfillmentStage,
} from '#shared/types/rental'

const props = defineProps<{
  booking: BookingRecord
  isAdmin?: boolean
  updating?: boolean
}>()

const emit = defineEmits<{
  'advance-stage': [stage: FulfillmentStage]
  'confirm-handover': []
}>()

const { formatDate } = useFormatters()

// Reactive clock ticked every 60s so return countdown stays live on screen
const nowMs = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  nowMs.value = Date.now()
  timer = setInterval(() => {
    nowMs.value = Date.now()
  }, 60_000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const resolved = computed(() => resolveBookingStage(props.booking))

const stages = computed(() => {
  const isCourier = props.booking.deliveryOption === 'kurir_antar'
  const stage3Title = isCourier ? 'Siap Dikirim Kurir' : 'Siap Diambil di Butik'
  const stage5Title = resolved.value.isDepositPending
    ? 'Selesai (Proses Deposit)'
    : 'Selesai & Deposit Kembali'

  return [
    {
      key: 'menunggu_pembayaran' as FulfillmentStage,
      label: 'Menunggu Pembayaran',
      shortLabel: 'Bayar',
      icon: CreditCard,
    },
    {
      key: 'dry_clean' as FulfillmentStage,
      label: 'Dikonfirmasi / Dry-Clean',
      shortLabel: 'Dry-Clean',
      icon: Sparkles,
    },
    {
      key: 'siap_ambil_kirim' as FulfillmentStage,
      label: stage3Title,
      shortLabel: isCourier ? 'Siap Kirim' : 'Siap Ambil',
      icon: isCourier ? Truck : Store,
    },
    {
      key: 'sedang_disewa' as FulfillmentStage,
      label: 'Sedang Disewa',
      shortLabel: 'Disewa',
      icon: Clock,
    },
    {
      key: 'selesai_deposit' as FulfillmentStage,
      label: stage5Title,
      shortLabel: 'Selesai',
      icon: ShieldCheck,
    },
  ]
})

// Live Return Countdown (calculated relative to 21:00 local time on endDate)
const returnCountdown = computed(() => {
  const parts = props.booking.endDate.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (!y || !m || !d) return null

  const now = new Date(nowMs.value)
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const endMid = new Date(y, m - 1, d).getTime()
  const diffDays = Math.round((endMid - todayMid) / (1000 * 60 * 60 * 24))

  // Deadline hour: 21:00 on return date
  const deadlineMs = new Date(y, m - 1, d, 21, 0, 0).getTime()
  const diffHours = Math.max(0, Math.ceil((deadlineMs - now.getTime()) / (1000 * 60 * 60)))

  if (diffDays > 1) {
    return {
      tone: 'sage' as const,
      headline: `Hitung Mundur Kembali: Sisa ${diffDays} hari lagi`,
      sub: `Kembalikan paling lambat ${formatDate(props.booking.endDate)} pukul 21.00 WIB`,
    }
  }
  if (diffDays === 1) {
    return {
      tone: 'amber' as const,
      headline: `Batas Kembali Besok (${diffHours} jam lagi)`,
      sub: `Jadwal kembali ${formatDate(props.booking.endDate)} — tak perlu dicuci (Gratis Dry-Clean)`,
    }
  }
  if (diffDays === 0) {
    return {
      tone: 'amber' as const,
      headline: diffHours > 0
        ? `Hari Terakhir Sewa! Sisa ±${diffHours} jam`
        : 'Hari Terakhir Sewa — Segera Kembalikan Hari Ini',
      sub: `Batas pengembalian hari ini (${formatDate(props.booking.endDate)}) pukul 21.00 WIB`,
    }
  }
  const lateDays = Math.abs(diffDays)
  return {
    tone: 'rose' as const,
    headline: `Terlambat ${lateDays} hari dari batas kembali`,
    sub: `Batas kembali ${formatDate(props.booking.endDate)} • estimasi denda telat Rp${(lateDays * 25000).toLocaleString('id-ID')}`,
  }
})

function isStepDone(idx: number): boolean {
  if (resolved.value.stage === 'selesai_deposit' && !resolved.value.isDepositPending) {
    return true
  }
  return idx < resolved.value.stepIndex
}

function isStepCurrent(idx: number): boolean {
  if (resolved.value.stage === 'selesai_deposit' && !resolved.value.isDepositPending) {
    return false
  }
  return idx === resolved.value.stepIndex
}

const currentStageSummary = computed(() => {
  const s = resolved.value.stage
  if (s === 'menunggu_pembayaran') {
    return 'Selesaikan pembayaran agar pesanan segera masuk tahap konfirmasi & dry-clean.'
  }
  if (s === 'dry_clean') {
    return 'Pesanan terkonfirmasi! Tim butik sedang menyiapkan dry-clean, steam & QC busana Anda.'
  }
  if (s === 'siap_ambil_kirim') {
    return props.booking.deliveryOption === 'kurir_antar'
      ? 'Busana sudah rapi, wangi & steril — siap dikirim oleh kurir ke alamat Anda.'
      : 'Busana sudah rapi, wangi & steril — silakan ambil di butik dengan membawa kartu identitas jaminan.'
  }
  if (s === 'sedang_disewa') {
    return props.booking.handoverRecipient
      ? `Busana sedang digunakan (diterima oleh ${props.booking.handoverRecipient}).`
      : 'Busana sedang dalam masa sewa aktif.'
  }
  if (resolved.value.isDepositPending) {
    return 'Busana sudah selesai disewa — sedang menunggu proses pengembalian deposit ke rekening/e-wallet Anda.'
  }
  return 'Penyewaan selesai & uang deposit telah dikembalikan. Terima kasih telah menyewa di Seruni Atelier!'
})
</script>

<template>
  <div
    v-if="props.booking.status !== 'dibatalkan'"
    class="mt-4 rounded-xl border border-[#EAE4DC] bg-[#FAF8F5] p-3.5"
  >
    <!-- Header Row -->
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="text-[10.5px] font-semibold uppercase tracking-wider text-[#6B655E]">
          Pelacakan Status Pesanan
        </span>
        <span
          class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          :class="
            resolved.stage === 'selesai_deposit' && !resolved.isDepositPending
              ? 'bg-[#E3E8E2] text-[#384239]'
              : resolved.stage === 'menunggu_pembayaran' || resolved.isDepositPending
                ? 'bg-[#F6E9D8] text-[#8C5E2A]'
                : 'bg-[#EEF2ED] text-[#455146]'
          "
        >
          Tahap {{ resolved.stepIndex + 1 }} / 5
        </span>
      </div>

      <!-- Admin 1-Click Stage Progression -->
      <div v-if="props.isAdmin && props.booking.status === 'aktif'" class="flex flex-wrap items-center gap-1.5">
        <button
          v-if="resolved.stage === 'dry_clean'"
          type="button"
          :disabled="props.updating"
          class="inline-flex items-center gap-1 rounded-md bg-[#556256] px-2.5 py-1 text-[10.5px] font-medium text-white transition-colors hover:bg-[#455146] disabled:opacity-60"
          @click="emit('advance-stage', 'siap_ambil_kirim')"
        >
          <PackageCheck class="h-3 w-3" />
          {{ props.booking.deliveryOption === 'kurir_antar' ? 'Tandai Siap Dikirim' : 'Tandai Siap Diambil' }}
          <ArrowRight class="h-3 w-3" />
        </button>

        <button
          v-else-if="resolved.stage === 'siap_ambil_kirim'"
          type="button"
          :disabled="props.updating"
          class="inline-flex items-center gap-1 rounded-md bg-[#2B2A28] px-2.5 py-1 text-[10.5px] font-medium text-white transition-colors hover:bg-[#3F3D39] disabled:opacity-60"
          @click="emit('confirm-handover')"
        >
          <PackageCheck class="h-3 w-3" />
          Serah Terima &amp; Mulai Sewa
          <ArrowRight class="h-3 w-3" />
        </button>
      </div>
    </div>

    <!-- 5-Step Progress Stepper -->
    <div class="grid grid-cols-5 gap-1 sm:gap-2">
      <div
        v-for="(step, idx) in stages"
        :key="step.key"
        class="relative flex flex-col items-center text-center"
      >
        <!-- Connector line to next step -->
        <div
          v-if="idx < stages.length - 1"
          class="pointer-events-none absolute left-1/2 top-3.5 h-[2px] w-full"
          :class="isStepDone(idx) ? 'bg-[#556256]' : 'bg-[#E2DCD3]'"
        />

        <!-- Circle Icon -->
        <div
          class="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all"
          :class="
            isStepDone(idx)
              ? 'border-[#556256] bg-[#556256] text-white'
              : isStepCurrent(idx)
                ? (resolved.stage === 'menunggu_pembayaran' || resolved.isDepositPending
                    ? 'border-[#B8843B] bg-[#FDF5E6] text-[#8C5E2A] ring-2 ring-[#B8843B]/20'
                    : 'border-[#2B2A28] bg-[#2B2A28] text-white ring-2 ring-[#2B2A28]/20')
                : 'border-[#DDD6CC] bg-white text-[#B0A89E]'
          "
        >
          <Check v-if="isStepDone(idx)" class="h-3.5 w-3.5" stroke-width="2.5" />
          <component :is="step.icon" v-else class="h-3.5 w-3.5" />
        </div>

        <!-- Step Label -->
        <span
          class="mt-1.5 text-[9.5px] leading-tight sm:text-[10.5px]"
          :class="
            isStepCurrent(idx)
              ? 'font-semibold text-[#2B2A28]'
              : isStepDone(idx)
                ? 'font-medium text-[#556256]'
                : 'text-[#9A938A]'
          "
        >
          <span class="hidden sm:inline">{{ step.label }}</span>
          <span class="sm:hidden">{{ step.shortLabel }}</span>
        </span>
      </div>
    </div>

    <!-- Live Return Countdown Banner (when Sedang Disewa) -->
    <div
      v-if="resolved.stage === 'sedang_disewa' && returnCountdown"
      class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[11px]"
      :class="
        returnCountdown.tone === 'rose'
          ? 'border-rose-200 bg-rose-50 text-rose-800'
          : returnCountdown.tone === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-[#C7D1C5] bg-[#EEF4ED] text-[#384239]'
      "
    >
      <div class="flex items-start gap-2">
        <AlertTriangle v-if="returnCountdown.tone === 'rose'" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
        <Clock v-else class="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          <p class="font-semibold">
            {{ returnCountdown.headline }}
          </p>
          <p class="text-[10.5px] opacity-85">
            {{ returnCountdown.sub }}
          </p>
        </div>
      </div>
    </div>

    <!-- Current Stage Description -->
    <p class="mt-2.5 text-[11px] leading-relaxed text-[#6B655E]">
      {{ currentStageSummary }}
    </p>
  </div>
</template>
