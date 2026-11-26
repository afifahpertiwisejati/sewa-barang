<script setup lang="ts">
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-vue-next'
import type { RentalItemDetail } from '#shared/types/rental'

const route = useRoute()
const router = useRouter()
const itemId = computed(() => String(route.params.id))
const { setActiveProduct } = useWhatsAppConsult()

const { data: item, pending, error, refresh } = await useFetch<RentalItemDetail>(
  () => `/api/items/${itemId.value}`,
)

const selectedColor = ref('')
const isRefreshingStock = ref(false)
let lastStockSyncAt = 0

function syncWhatsAppContext() {
  const val = item.value
  if (!val) {
    setActiveProduct(null)
    return
  }
  setActiveProduct({
    id: val.id,
    name: selectedColor.value ? `${val.name} (Warna ${selectedColor.value})` : val.name,
    category: val.category,
    pricePerDay: val.pricePerDay,
  })
}

async function refreshLiveStock(force = false) {
  const now = Date.now()
  if (!force && now - lastStockSyncAt < 3000) return
  lastStockSyncAt = now
  isRefreshingStock.value = true
  try {
    await refresh()
  }
  finally {
    isRefreshingStock.value = false
  }
}

watch(
  item,
  (val) => {
    if (val?.colors?.length) {
      const queryColor = typeof route.query.color === 'string' ? route.query.color.trim().toLowerCase() : ''
      const matchedFromQuery = queryColor
        ? val.colors.find(c => c.name.trim().toLowerCase() === queryColor)
        : undefined
      const currentStillValid = val.colors.some(c => c.name === selectedColor.value)

      if (!currentStillValid) {
        selectedColor.value = matchedFromQuery?.name ?? val.colors[0]!.name
      }
    }
    else {
      selectedColor.value = ''
    }
    syncWhatsAppContext()
  },
  { immediate: true },
)

watch(selectedColor, (newColor, oldColor) => {
  syncWhatsAppContext()
  if (!import.meta.client || !newColor) return
  if (route.query.color !== newColor) {
    router.replace({ query: { ...route.query, color: newColor } }).catch(() => {})
  }
  if (oldColor && newColor !== oldColor) {
    refreshLiveStock(false)
  }
})

function handleWindowFocus() {
  refreshLiveStock(false)
}

onMounted(() => {
  window.addEventListener('focus', handleWindowFocus)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', handleWindowFocus)
  setActiveProduct(null)
})

useHead(() => ({
  title: item.value ? `${item.value.name} — Seruni Atelier` : 'Detail Busana — Seruni Atelier',
}))

async function handleBooked() {
  await refreshLiveStock(true)
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 rounded-md border border-[#E8E3DC] bg-white px-3.5 py-2 text-xs font-medium text-[#2B2A28] transition-colors hover:border-[#2B2A28]"
      >
        <ArrowLeft class="h-3.5 w-3.5" />
        Kembali ke Koleksi
      </NuxtLink>

      <div v-if="item" class="flex items-center gap-2 text-xs text-[#8A837A]">
        <span>Koleksi</span>
        <span>/</span>
        <span class="font-medium text-[#556256]">{{ item.category }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending && !item" class="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div class="space-y-4 lg:col-span-7">
        <div class="aspect-[16/11] animate-pulse rounded-2xl bg-[#EFECE7]" />
        <div class="h-40 animate-pulse rounded-2xl bg-white" />
      </div>
      <div class="lg:col-span-5">
        <div class="h-96 animate-pulse rounded-2xl bg-white" />
      </div>
    </div>

    <!-- Error / Not Found -->
    <div
      v-else-if="error || !item"
      class="rounded-2xl border border-[#E8E3DC] bg-white px-6 py-16 text-center"
    >
      <h1 class="font-serif text-2xl text-[#2B2A28]">
        Busana Tidak Ditemukan
      </h1>
      <p class="mt-2 text-sm text-[#8A837A]">
        Maaf, dress atau kebaya yang Anda cari mungkin sudah tidak tersedia.
      </p>
      <NuxtLink
        to="/"
        class="mt-5 inline-flex items-center gap-2 rounded-md bg-[#2B2A28] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#3F3D39]"
      >
        Kembali ke Beranda
      </NuxtLink>
    </div>

    <!-- Item Detail Content -->
    <div v-else class="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <!-- Left Column -->
      <div class="space-y-6 lg:col-span-7 xl:col-span-8">
        <!-- Title Header -->
        <div>
          <div class="flex flex-wrap items-center gap-2.5 text-xs">
            <span class="rounded-full bg-[#EFECE7] px-3 py-1 font-medium text-[#556256]">
              {{ item.category }}
            </span>
            <span class="inline-flex items-center gap-1 text-[#6B655E]">
              <MapPin class="h-3.5 w-3.5 text-[#8A837A]" />
              {{ item.location }}
            </span>
            <span class="inline-flex items-center gap-1 font-medium text-[#2B2A28]">
              <Star class="h-3.5 w-3.5 fill-[#C8A26A] text-[#C8A26A]" />
              {{ item.rating.toFixed(1) }}
              <span class="font-normal text-[#8A837A]">({{ item.reviewCount }} ulasan)</span>
            </span>
          </div>
          <h1 class="mt-3 font-serif text-2xl font-normal tracking-tight text-[#2B2A28] sm:text-3xl">
            {{ item.name }}
          </h1>
        </div>

        <!-- Photo Gallery -->
        <ItemGallery
          v-model:selected-color="selectedColor"
          :name="item.name"
          :images="item.gallery"
          :colors="item.colors"
        />

        <!-- Description -->
        <section class="rounded-2xl border border-[#E8E3DC] bg-white p-5 sm:p-6">
          <h2 class="font-serif text-lg font-medium text-[#2B2A28]">
            Detail Busana &amp; Kelengkapan
          </h2>
          <p class="mt-3 text-sm leading-relaxed text-[#6B655E]">
            {{ item.description }}
          </p>

          <div class="mt-5 grid grid-cols-1 gap-3 border-t border-[#EFECE7] pt-5 sm:grid-cols-2">
            <div class="flex items-start gap-2.5 rounded-xl bg-[#FAF8F5] p-3.5">
              <Sparkles class="mt-0.5 h-4 w-4 shrink-0 text-[#556256]" />
              <div class="text-xs">
                <p class="font-semibold text-[#2B2A28]">Sudah Termasuk Dry-Clean</p>
                <p class="mt-0.5 text-[#8A837A]">Busana dikirim dalam kondisi steril &amp; wangi. Setelah acara, cukup kembalikan tanpa perlu dicuci.</p>
              </div>
            </div>
            <div class="flex items-start gap-2.5 rounded-xl bg-[#FAF8F5] p-3.5">
              <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0 text-[#556256]" />
              <div class="text-xs">
                <p class="font-semibold text-[#2B2A28]">Deposit 100% Refundable</p>
                <p class="mt-0.5 text-[#8A837A]">Deposit keamanan dikembalikan penuh setelah busana diterima kembali oleh pemilik.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Specifications -->
        <section class="rounded-2xl border border-[#E8E3DC] bg-white p-5 sm:p-6">
          <h2 class="font-serif text-lg font-medium text-[#2B2A28]">
            Spesifikasi &amp; Panduan Ukuran
          </h2>
          <dl class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              v-for="spec in item.specs"
              :key="spec.label"
              class="rounded-xl border border-[#EFECE7] bg-[#FAF8F5] px-4 py-3"
            >
              <dt class="text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
                {{ spec.label }}
              </dt>
              <dd class="mt-1 text-sm font-medium text-[#2B2A28]">
                {{ spec.value }}
              </dd>
            </div>
          </dl>
        </section>

        <!-- Owner Profile -->
        <section>
          <h2 class="mb-3 font-serif text-lg font-medium text-[#2B2A28]">
            Profil Pemilik / Butik
          </h2>
          <OwnerCard :owner="item.owner" />
        </section>
      </div>

      <!-- Right Column: Real-Time Booking Calculator -->
      <div class="lg:col-span-5 xl:col-span-4">
        <BookingCalculator
          v-model:selected-color="selectedColor"
          :item="item"
          :is-refreshing-stock="isRefreshingStock"
          @booked="handleBooked"
          @refresh-stock="refreshLiveStock(true)"
        />
      </div>
    </div>
  </div>
</template>
