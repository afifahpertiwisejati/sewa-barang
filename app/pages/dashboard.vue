<script setup lang="ts">
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
} from 'lucide-vue-next'
import type { BookingRecord } from '#shared/types/rental'

definePageMeta({
  middleware: ['auth'],
})

useHead({
  title: 'Penyewaan Saya — SewaIn+',
})

const { user, isAdmin } = useAuth()
const { formatRupiah } = useFormatters()
const { fetchNotifications } = useNotifications()

const {
  data: bookings,
  pending: bookingsPending,
  refresh: refreshBookings,
} = await useFetch<BookingRecord[]>('/api/bookings', {
  default: () => [],
})

const stats = computed(() => {
  const list = bookings.value ?? []
  const active = list.filter(b => b.status === 'aktif')
  const completed = list.filter(b => b.status === 'selesai')
  const heldDeposit = list
    .filter(b => b.status !== 'dibatalkan' && b.depositStatus !== 'dikembalikan' && b.depositStatus !== 'dipotong')
    .reduce((sum, b) => sum + b.deposit, 0)
  const pendingRefundCount = list.filter(
    b => b.status !== 'dibatalkan' && b.deposit > 0 && b.depositStatus === 'menunggu_pengembalian',
  ).length
  const refundedDeposit = list
    .filter(b => b.depositStatus === 'dikembalikan' || b.depositStatus === 'dipotong')
    .reduce((sum, b) => sum + (b.depositRefundAmount ?? b.deposit), 0)

  return {
    activeCount: active.length,
    completedCount: completed.length,
    protectedDeposit: heldDeposit,
    pendingRefundCount,
    refundedDeposit,
  }
})

async function handleBookingUpdated() {
  await Promise.all([
    refreshBookings(),
    fetchNotifications({ silent: true }),
  ])
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-[#EFECE7] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#556256]">
          <ShieldCheck v-if="isAdmin" class="h-3.5 w-3.5" />
          <UserCheck v-else class="h-3.5 w-3.5" />
          {{ isAdmin ? 'Akun Admin Butik' : 'Akun Penyewa' }}
        </span>
        <h1 class="mt-2 font-serif text-3xl font-normal tracking-tight text-[#2B2A28]">
          Penyewaan Saya
        </h1>
        <p class="mt-1 text-xs text-[#8A837A] sm:text-sm">
          Halo, <strong class="text-[#2B2A28]">{{ user?.name }}</strong> ({{ user?.email }}). Pantau status sewa dan pengembalian deposit Anda di sini.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <NuxtLink
          v-if="isAdmin"
          to="/admin"
          class="inline-flex items-center gap-1.5 rounded-md bg-[#556256] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#455146]"
        >
          Buka Panel Admin
          <ArrowRight class="h-3.5 w-3.5" />
        </NuxtLink>
        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center rounded-md border border-[#E8E3DC] bg-white px-4 py-2.5 text-xs font-medium text-[#2B2A28] transition-colors hover:border-[#2B2A28]"
        >
          Jelajahi Koleksi
        </NuxtLink>
      </div>
    </div>

    <NotificationBanner />

    <!-- Summary KPI Cards -->
    <div class="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      <div class="rounded-2xl border border-[#E8E3DC] bg-white p-4">
        <div class="flex items-center justify-between">
          <span class="text-xs text-[#8A837A]">Sewa Aktif</span>
          <ShoppingBag class="h-4 w-4 text-[#556256]" stroke-width="1.75" />
        </div>
        <p class="mt-2 font-serif text-2xl font-medium text-[#2B2A28]">
          {{ stats.activeCount }}
        </p>
        <p class="mt-0.5 text-[11px] text-[#A39C93]">
          Busana &amp; sepatu sedang disewa
        </p>
      </div>

      <div class="rounded-2xl border border-[#E8E3DC] bg-white p-4">
        <div class="flex items-center justify-between">
          <span class="text-xs text-[#8A837A]">Sewa Selesai</span>
          <CheckCircle2 class="h-4 w-4 text-[#556256]" stroke-width="1.75" />
        </div>
        <p class="mt-2 font-serif text-2xl font-medium text-[#2B2A28]">
          {{ stats.completedCount }}
        </p>
        <p class="mt-0.5 text-[11px] text-[#A39C93]">
          Acara berjalan sukses
        </p>
      </div>

      <div class="rounded-2xl border border-[#E8E3DC] bg-white p-4">
        <div class="flex items-center justify-between">
          <span class="text-xs text-[#8A837A]">Deposit Aktif (Terproteksi)</span>
          <ShieldCheck class="h-4 w-4 text-[#556256]" stroke-width="1.75" />
        </div>
        <p class="mt-2 font-serif text-2xl font-medium text-[#556256]">
          {{ formatRupiah(stats.protectedDeposit) }}
        </p>
        <p class="mt-0.5 text-[11px] text-[#A39C93]">
          <template v-if="stats.pendingRefundCount > 0">
            {{ stats.pendingRefundCount }} pengajuan pengembalian sedang diproses admin
          </template>
          <template v-else-if="stats.protectedDeposit > 0">
            100% refundable — klik "Ajukan Pengembalian Deposit" saat selesai
          </template>
          <template v-else-if="stats.refundedDeposit > 0">
            Total {{ formatRupiah(stats.refundedDeposit) }} sudah dikembalikan
          </template>
          <template v-else>
            Belum ada deposit yang ditahan
          </template>
        </p>
      </div>
    </div>

    <!-- Rentals List -->
    <div class="mt-8">
      <MyRentalsTab
        :bookings="bookings ?? []"
        :pending="bookingsPending"
        @updated="handleBookingUpdated"
      />
    </div>
  </div>
</template>
