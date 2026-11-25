<script setup lang="ts">
import { Bell, Check, CheckCheck } from 'lucide-vue-next'

const { isAdmin } = useAuth()
const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

const latestUnread = computed(() =>
  notifications.value.filter(n => !n.isRead).slice(0, 3),
)

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diffMs) || diffMs < 60_000) return 'Baru saja'
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${mins} mnt lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}
</script>

<template>
  <section
    v-if="unreadCount > 0"
    class="mt-6 overflow-hidden rounded-2xl border border-[#D7E0D5] bg-[#F5F8F4]"
  >
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2EAE0] px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-[#556256] text-white">
          <Bell class="h-3.5 w-3.5" />
        </span>
        <div>
          <p class="text-xs font-semibold text-[#2B2A28]">
            {{ unreadCount }} {{ isAdmin ? 'Notifikasi Admin Belum Dibaca' : 'Notifikasi Baru Untuk Anda' }}
          </p>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md border border-[#D7E0D5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#556256] transition-colors hover:border-[#556256]"
        @click="markAllAsRead"
      >
        <CheckCheck class="h-3.5 w-3.5" />
        Tandai semua dibaca
      </button>
    </div>

    <div class="divide-y divide-[#E7EFE5]">
      <div
        v-for="notif in latestUnread"
        :key="notif.id"
        class="flex items-start justify-between gap-3 px-4 py-3"
      >
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p class="text-xs font-semibold text-[#2B2A28]">
              {{ notif.title }}
            </p>
            <span class="text-[10px] text-[#8A837A]">
              &bull; {{ formatRelativeTime(notif.createdAt) }}
            </span>
          </div>
          <p class="mt-0.5 text-[11px] leading-relaxed text-[#5C534E]">
            {{ notif.message }}
          </p>
        </div>

        <button
          type="button"
          class="shrink-0 rounded-full border border-[#D7E0D5] bg-white p-1.5 text-[#556256] transition-colors hover:bg-[#556256] hover:text-white"
          title="Tandai sudah dibaca"
          aria-label="Tandai sudah dibaca"
          @click="markAsRead(notif.id)"
        >
          <Check class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </section>
</template>
