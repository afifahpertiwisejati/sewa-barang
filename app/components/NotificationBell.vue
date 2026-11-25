<script setup lang="ts">
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wallet,
  XCircle,
} from 'lucide-vue-next'
import type { NotificationRecord, NotificationType } from '#shared/types/rental'

const { isLoggedIn, isAdmin, user } = useAuth()
const {
  notifications,
  unreadCount,
  loading,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
} = useNotifications()
const router = useRouter()
const route = useRoute()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diffMs) || diffMs < 60_000) return 'Baru saja'
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${mins} mnt lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getIconMeta(type: NotificationType) {
  switch (type) {
    case 'booking_new':
      return { icon: ShoppingBag, bg: 'bg-[#EEF2ED]', color: 'text-[#556256]' }
    case 'payment_confirmed':
      return { icon: CreditCard, bg: 'bg-emerald-50', color: 'text-emerald-700' }
    case 'guarantee_updated':
      return { icon: ShieldCheck, bg: 'bg-sky-50', color: 'text-sky-700' }
    case 'deposit_requested':
      return { icon: Wallet, bg: 'bg-amber-50', color: 'text-amber-700' }
    case 'deposit_refunded':
      return { icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-700' }
    case 'booking_completed':
      return { icon: Sparkles, bg: 'bg-emerald-50', color: 'text-emerald-700' }
    case 'booking_cancelled':
      return { icon: XCircle, bg: 'bg-rose-50', color: 'text-rose-700' }
    default:
      return { icon: Bell, bg: 'bg-[#F3EFE9]', color: 'text-[#6B655E]' }
  }
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    fetchNotifications({ silent: notifications.value.length > 0 })
  }
}

async function handleItemClick(notif: NotificationRecord) {
  await markAsRead(notif.id)
  isOpen.value = false
  if (notif.actionUrl) {
    if (route.path === notif.actionUrl) {
      await refreshNuxtData()
    }
    else {
      await router.push(notif.actionUrl)
    }
  }
}

function handleOutsideClick(event: MouseEvent) {
  if (!isOpen.value) return
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

function handleVisibilityChange() {
  if (!document.hidden && isLoggedIn.value) {
    fetchNotifications({ notifyNew: true, silent: true })
  }
}

watch(
  () => user.value?.id,
  (uid) => {
    if (uid) {
      fetchNotifications({ silent: true })
    }
  },
  { immediate: true },
)

watch(() => route.fullPath, () => {
  isOpen.value = false
  if (isLoggedIn.value) {
    fetchNotifications({ silent: true })
  }
})

onMounted(() => {
  if (isLoggedIn.value) {
    fetchNotifications({ silent: true })
  }
  document.addEventListener('click', handleOutsideClick)
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  pollTimer = setInterval(() => {
    if (isLoggedIn.value && !document.hidden) {
      fetchNotifications({ notifyNew: true, silent: true })
    }
  }, 15_000)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<template>
  <div v-if="isLoggedIn" ref="containerRef" class="relative">
    <button
      type="button"
      class="relative rounded-full p-1.5 text-[#2B2A28] transition-colors hover:bg-[#EFECE7] sm:p-2"
      :aria-label="isAdmin ? 'Notifikasi Admin' : 'Notifikasi Saya'"
      :title="isAdmin ? 'Notifikasi Admin' : 'Notifikasi Saya'"
      @click="toggleDropdown"
    >
      <Bell class="h-[18px] w-[18px]" stroke-width="1.75" />
      <span
        v-if="unreadCount > 0"
        class="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-sm"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="fixed inset-x-3 top-[68px] z-50 overflow-hidden rounded-2xl border border-[#E8E3DC] bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-[#EFECE7] bg-[#FAF8F5] px-4 py-3">
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-semibold text-[#2B2A28]">
              {{ isAdmin ? 'Notifikasi Admin' : 'Notifikasi Saya' }}
            </h3>
            <span
              v-if="unreadCount > 0"
              class="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
            >
              {{ unreadCount }} baru
            </span>
          </div>

          <button
            v-if="unreadCount > 0"
            type="button"
            class="inline-flex items-center gap-1 text-[11px] font-medium text-[#556256] transition-colors hover:text-[#2B2A28]"
            @click="markAllAsRead"
          >
            <CheckCheck class="h-3.5 w-3.5" />
            Tandai semua dibaca
          </button>
        </div>

        <!-- Notification List -->
        <div class="max-h-[65vh] overflow-y-auto divide-y divide-[#F3EFE9] sm:max-h-[420px]">
          <div v-if="loading && notifications.length === 0" class="px-4 py-8 text-center text-xs text-[#8A837A]">
            Memuat notifikasi...
          </div>

          <div v-else-if="notifications.length === 0" class="px-6 py-10 text-center">
            <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF8F5] text-[#A39C93]">
              <Bell class="h-5 w-5" />
            </div>
            <p class="mt-3 text-xs font-medium text-[#2B2A28]">
              Belum ada notifikasi
            </p>
            <p class="mt-1 text-[11px] text-[#8A837A]">
              {{ isAdmin
                ? 'Pesanan baru, pembayaran, dan pengajuan deposit penyewa akan tampil di sini.'
                : 'Update status booking, pembayaran, jaminan, dan pengembalian deposit akan tampil di sini.' }}
            </p>
          </div>

          <button
            v-for="notif in notifications"
            :key="notif.id"
            type="button"
            class="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#FAF8F5]"
            :class="!notif.isRead ? 'bg-[#F8FAF7]' : 'bg-white'"
            @click="handleItemClick(notif)"
          >
            <div
              class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              :class="[getIconMeta(notif.type).bg, getIconMeta(notif.type).color]"
            >
              <component :is="getIconMeta(notif.type).icon" class="h-4 w-4" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs font-semibold leading-snug text-[#2B2A28]">
                  {{ notif.title }}
                </p>
                <span
                  v-if="!notif.isRead"
                  class="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#556256]"
                  title="Belum dibaca"
                />
              </div>
              <p class="mt-0.5 text-[11px] leading-relaxed text-[#6B655E]">
                {{ notif.message }}
              </p>
              <div class="mt-1.5 flex items-center gap-2 text-[10px] text-[#A39C93]">
                <span>{{ formatRelativeTime(notif.createdAt) }}</span>
                <span v-if="notif.bookingId">&bull; {{ notif.bookingId }}</span>
              </div>
            </div>
          </button>
        </div>

        <!-- Footer -->
        <div class="border-t border-[#EFECE7] bg-[#FAF8F5] px-4 py-2.5 text-center">
          <NuxtLink
            :to="isAdmin ? '/admin' : '/dashboard'"
            class="text-[11px] font-medium text-[#556256] transition-colors hover:text-[#2B2A28]"
            @click="isOpen = false"
          >
            {{ isAdmin ? 'Buka Panel Admin Butik →' : 'Lihat Semua Penyewaan Saya →' }}
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>
