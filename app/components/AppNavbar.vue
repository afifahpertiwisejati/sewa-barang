<script setup lang="ts">
import {
  Heart,
  LogIn,
  LogOut,
  Menu,
  Ruler,
  Search,
  ShieldCheck,
  ShoppingBag,
  X,
} from 'lucide-vue-next'
import type { BookingRecord } from '#shared/types/rental'

const route = useRoute()
const router = useRouter()
const mobileOpen = ref(false)
const { count: wishlistCount } = useWishlist()
const { user, isLoggedIn, isAdmin, logout } = useAuth()
const { openSizeGuide } = useSizeGuide()
const toast = useToast()

const { data: bookings } = useFetch<BookingRecord[]>('/api/bookings', {
  key: 'nav-bookings',
  default: () => [],
})

const activeCount = computed(() =>
  (bookings.value ?? []).filter(b => b.status === 'aktif').length,
)

watch(() => route.fullPath, () => {
  mobileOpen.value = false
})

function focusSearch() {
  if (route.path !== '/') {
    router.push('/#pencarian')
    return
  }
  if (import.meta.client) {
    const el = document.getElementById('hero-keyword')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => el?.focus(), 300)
  }
}

async function handleLogout() {
  await logout()
  toast.push('Berhasil Keluar', {
    description: 'Anda telah keluar dari akun Seruni Atelier.',
    type: 'info',
  })
  if (route.path.startsWith('/admin') || route.path.startsWith('/dashboard')) {
    await router.push('/')
  }
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-[#E8E3DC] bg-[#FAF8F5]/95 backdrop-blur-md">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-5 sm:px-6 lg:px-8">
      <!-- Left -->
      <div class="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          class="-ml-1 inline-flex items-center justify-center rounded-lg p-1.5 text-[#2B2A28] hover:bg-[#EFECE7] md:hidden"
          :aria-label="mobileOpen ? 'Tutup menu' : 'Buka menu'"
          @click="mobileOpen = !mobileOpen"
        >
          <X v-if="mobileOpen" class="h-5 w-5" />
          <Menu v-else class="h-5 w-5" />
        </button>

        <NuxtLink to="/" class="font-serif text-lg font-medium tracking-tight text-[#2B2A28] sm:text-2xl">
          Seruni <span class="italic text-[#556256]">Atelier</span>
        </NuxtLink>
      </div>

      <!-- Center: Role-Aware Links -->
      <nav class="hidden items-center gap-7 md:flex">
        <NuxtLink
          to="/"
          class="relative py-1 text-sm font-medium transition-colors"
          :class="
            route.path === '/'
              ? 'text-[#2B2A28] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-full after:bg-[#2B2A28]'
              : 'text-[#6B655E] hover:text-[#2B2A28]'
          "
        >
          Beranda
        </NuxtLink>
        <NuxtLink
          to="/#katalog"
          class="py-1 text-sm font-medium text-[#6B655E] transition-colors hover:text-[#2B2A28]"
        >
          Koleksi
        </NuxtLink>
        <NuxtLink
          to="/#terbaru"
          class="py-1 text-sm font-medium text-[#6B655E] transition-colors hover:text-[#2B2A28]"
        >
          Baru Masuk
        </NuxtLink>
        <NuxtLink
          to="/cara-sewa"
          class="relative py-1 text-sm font-medium transition-colors"
          :class="
            route.path === '/cara-sewa'
              ? 'text-[#2B2A28] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-full after:bg-[#2B2A28]'
              : 'text-[#6B655E] hover:text-[#2B2A28]'
          "
        >
          Cara Sewa &amp; S&amp;K
        </NuxtLink>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 py-1 text-sm font-medium text-[#6B655E] transition-colors hover:text-[#2B2A28]"
          @click="openSizeGuide()"
        >
          <Ruler class="h-3.5 w-3.5 text-[#556256]" />
          Panduan Ukuran
        </button>
        <NuxtLink
          v-if="isLoggedIn"
          to="/dashboard"
          class="relative py-1 text-sm font-medium transition-colors"
          :class="
            route.path === '/dashboard'
              ? 'text-[#2B2A28] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-full after:bg-[#2B2A28]'
              : 'text-[#6B655E] hover:text-[#2B2A28]'
          "
        >
          Sewaan Saya
        </NuxtLink>
        <NuxtLink
          v-if="isAdmin"
          to="/admin"
          class="relative inline-flex items-center gap-1.5 py-1 text-sm font-medium transition-colors"
          :class="
            route.path.startsWith('/admin')
              ? 'text-[#556256] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-full after:bg-[#556256]'
              : 'text-[#556256] hover:text-[#2B2A28]'
          "
        >
          <ShieldCheck class="h-4 w-4" />
          Panel Admin
        </NuxtLink>
      </nav>

      <!-- Right Icons & Auth Controls -->
      <div class="flex shrink-0 items-center gap-1 sm:gap-2.5">
        <button
          type="button"
          class="rounded-full p-1.5 text-[#2B2A28] transition-colors hover:bg-[#EFECE7] sm:p-2"
          aria-label="Cari koleksi"
          title="Cari koleksi"
          @click="focusSearch"
        >
          <Search class="h-[18px] w-[18px]" stroke-width="1.75" />
        </button>

        <NuxtLink
          to="/#katalog"
          class="relative hidden rounded-full p-2 text-[#2B2A28] transition-colors hover:bg-[#EFECE7] sm:inline-flex"
          aria-label="Favorit"
          title="Favorit"
        >
          <Heart class="h-[18px] w-[18px]" stroke-width="1.75" />
          <span
            v-if="wishlistCount > 0"
            class="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B48A78] px-1 text-[9px] font-bold text-white"
          >
            {{ wishlistCount }}
          </span>
        </NuxtLink>

        <NotificationBell v-if="isLoggedIn" />

        <NuxtLink
          :to="isLoggedIn ? (isAdmin ? '/admin' : '/dashboard') : '/login'"
          class="relative rounded-full p-1.5 text-[#2B2A28] transition-colors hover:bg-[#EFECE7] sm:p-2"
          aria-label="Penyewaan"
          :title="isAdmin ? 'Pesanan Masuk (Admin)' : 'Penyewaan Saya'"
        >
          <ShoppingBag class="h-[18px] w-[18px]" stroke-width="1.75" />
          <span
            v-if="isLoggedIn"
            class="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8D6E5E] px-1 text-[9px] font-bold text-white"
          >
            {{ activeCount }}
          </span>
        </NuxtLink>

        <!-- Logged In Pill + Logout -->
        <div v-if="isLoggedIn && user" class="ml-1 hidden items-center gap-2 sm:flex">
          <NuxtLink
            :to="isAdmin ? '/admin' : '/dashboard'"
            class="inline-flex items-center gap-2 rounded-full border border-[#E8E3DC] bg-white py-1 pl-1.5 pr-3 text-xs font-medium text-[#2B2A28] transition-colors hover:border-[#2B2A28]"
          >
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              :class="isAdmin ? 'bg-[#556256]' : 'bg-[#2B2A28]'"
            >
              {{ user.avatarInitials }}
            </span>
            <span class="max-w-[90px] truncate">{{ user.name.split(' ')[0] }}</span>
            <span
              class="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase"
              :class="isAdmin ? 'bg-[#E3E8E2] text-[#455146]' : 'bg-[#EFECE7] text-[#6B655E]'"
            >
              {{ isAdmin ? 'Admin' : 'User' }}
            </span>
          </NuxtLink>

          <button
            type="button"
            class="rounded-full p-2 text-[#6B655E] transition-colors hover:bg-[#EFECE7] hover:text-[#2B2A28]"
            aria-label="Keluar"
            title="Keluar"
            @click="handleLogout"
          >
            <LogOut class="h-4 w-4" stroke-width="1.75" />
          </button>
        </div>

        <!-- Guest Login Button -->
        <NuxtLink
          v-else
          to="/login"
          class="ml-1.5 mr-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#2B2A28] px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-[#3F3D39] sm:mr-0 sm:px-3.5 sm:py-2 sm:text-xs"
        >
          <LogIn class="h-3.5 w-3.5" />
          <span>Masuk</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Mobile Navigation Drawer -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="mobileOpen"
        class="border-t border-[#E8E3DC] bg-[#FAF8F5] px-4 pb-5 pt-3 shadow-md md:hidden"
      >
        <div v-if="isLoggedIn && user" class="mb-3 flex items-center justify-between rounded-xl border border-[#E8E3DC] bg-white px-3 py-2.5">
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
              :class="isAdmin ? 'bg-[#556256]' : 'bg-[#2B2A28]'"
            >
              {{ user.avatarInitials }}
            </span>
            <div>
              <p class="text-xs font-semibold text-[#2B2A28]">{{ user.name }}</p>
              <p class="text-[11px] text-[#8A837A]">
                {{ isAdmin ? 'Role: Admin Butik' : 'Role: Penyewa (User)' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="rounded-lg border border-[#E8E3DC] px-2.5 py-1 text-[11px] font-medium text-[#6B655E]"
            @click="handleLogout"
          >
            Keluar
          </button>
        </div>

        <div class="flex flex-col gap-1">
          <NuxtLink to="/" class="rounded-lg px-3 py-2.5 text-sm font-medium text-[#2B2A28] hover:bg-[#EFECE7]">
            Beranda
          </NuxtLink>
          <NuxtLink to="/#katalog" class="rounded-lg px-3 py-2.5 text-sm font-medium text-[#6B655E] hover:bg-[#EFECE7]">
            Koleksi
          </NuxtLink>
          <NuxtLink to="/cara-sewa" class="rounded-lg px-3 py-2.5 text-sm font-medium text-[#6B655E] hover:bg-[#EFECE7]">
            Cara Sewa &amp; S&amp;K
          </NuxtLink>
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#6B655E] hover:bg-[#EFECE7] hover:text-[#2B2A28]"
            @click="mobileOpen = false; openSizeGuide()"
          >
            <Ruler class="h-4 w-4 text-[#556256]" />
            Panduan Ukuran (Size Chart)
          </button>
          <NuxtLink
            v-if="isLoggedIn"
            to="/dashboard"
            class="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-[#6B655E] hover:bg-[#EFECE7]"
          >
            <span>Penyewaan Saya</span>
            <span class="rounded-full bg-[#556256] px-2 py-0.5 text-[11px] font-semibold text-white">
              {{ activeCount }}
            </span>
          </NuxtLink>
          <NuxtLink
            v-if="isAdmin"
            to="/admin"
            class="rounded-lg bg-[#F3F5F2] px-3 py-2.5 text-sm font-semibold text-[#556256]"
          >
            Panel Admin Butik
          </NuxtLink>
          <NuxtLink
            v-if="!isLoggedIn"
            to="/login"
            class="mt-2 rounded-lg bg-[#2B2A28] px-4 py-2.5 text-center text-sm font-medium text-white"
          >
            Masuk / Daftar Akun
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </header>
</template>
