<script setup lang="ts">
import { ArrowRight, PackageSearch, RotateCcw, SlidersHorizontal, X } from 'lucide-vue-next'
import {
  RENTAL_CATEGORIES,
  type CategoryFilter,
  type ItemsListResponse,
  type RentalCategory,
  type RentalItem,
} from '#shared/types/rental'
import { DEFAULT_MAX_PRICE } from '../composables/useCatalogFilters'

useHead({
  title: 'Seruni Atelier — Sewa Dress & Kebaya Modern, Lamaran, dan Pesta',
})

const { filters, hasActiveFilters, resetFilters } = useCatalogFilters()
const showMobileFilter = ref(false)

const queryParams = computed(() => {
  const params: Record<string, string | number> = {
    sort: filters.value.sort,
  }
  if (filters.value.q.trim()) params.q = filters.value.q.trim()
  if (filters.value.location.trim()) params.location = filters.value.location.trim()
  if (filters.value.category !== 'Semua') params.category = filters.value.category
  if (filters.value.maxPrice < DEFAULT_MAX_PRICE) params.maxPrice = filters.value.maxPrice
  if (filters.value.availableOnly) params.availableOnly = 'true'
  if (filters.value.startDate && filters.value.endDate) {
    params.startDate = filters.value.startDate
    params.endDate = filters.value.endDate
  }
  return params
})

const { data, pending, refresh } = await useFetch<ItemsListResponse>('/api/items', {
  query: queryParams,
  watch: [queryParams],
})

const { data: newestData, refresh: refreshNewest } = await useFetch<ItemsListResponse>('/api/items', {
  key: 'newest-arrivals',
  query: { sort: 'newest' },
})

const items = computed(() => data.value?.items ?? [])
const allCatalogItems = computed(() => newestData.value?.items ?? items.value)
const newestItems = computed(() => allCatalogItems.value.slice(0, 4))
const cities = computed(() => data.value?.availableCities ?? [])
const maxCatalogPrice = computed(() => data.value?.maxCatalogPrice ?? DEFAULT_MAX_PRICE)

const categoryCounts = computed<Record<string, number>>(() => {
  const list = allCatalogItems.value
  const counts: Record<string, number> = { Semua: list.length }
  for (const cat of RENTAL_CATEGORIES) {
    counts[cat] = list.filter(i => i.category === cat).length
  }
  return counts
})

const etalaseMeta: Record<RentalCategory, { title: string, subtitle: string }> = {
  'Kebaya Modern': {
    title: 'Etalase Kebaya Modern',
    subtitle: 'Kebaya payet modern, kutubaru, dan kurung Melayu siap pakai',
  },
  'Gaun Pesta': {
    title: 'Etalase Gaun Pesta & Dress Modern',
    subtitle: 'Koleksi dress bridesmaid, kondangan, dan gaun malam elegan',
  },
  'Jas Pria': {
    title: 'Etalase Jas Pria Formal',
    subtitle: 'Setelan jas slim-fit, tuxedo, dan jas wisuda pria rapi',
  },
  'High Heels': {
    title: 'Etalase High Heels',
    subtitle: 'Sepatu hak pesta & wisuda nyaman dalam berbagai ukuran',
  },
  'Sepatu Pantofel': {
    title: 'Etalase Sepatu Pantofel Pria',
    subtitle: 'Pantofel kulit formal serasi untuk setelan jas & acara resmi',
  },
}

const groupedByEtalase = computed(() => {
  const list = items.value
  return RENTAL_CATEGORIES
    .map((category) => {
      const groupItems = list.filter(item => item.category === category)
      return {
        category,
        title: etalaseMeta[category].title,
        subtitle: etalaseMeta[category].subtitle,
        items: groupItems,
      }
    })
    .filter(group => group.items.length > 0)
})

const showGroupedEtalase = computed(() => filters.value.category === 'Semua')

const quickTabs: CategoryFilter[] = ['Semua', ...RENTAL_CATEGORIES]

function scrollToCatalog() {
  if (import.meta.client) {
    document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' })
  }
}

function selectEtalase(category: CategoryFilter) {
  filters.value.category = category
  scrollToCatalog()
}

function selectPromoCategory(category: 'Kebaya Modern' | 'Gaun Pesta') {
  filters.value.category = category
  scrollToCatalog()
}

onMounted(() => {
  refresh()
  refreshNewest()
})
</script>

<template>
  <div class="bg-[#FAF8F5]">
    <!-- Editorial Linen Hero + Quick Search -->
    <HeroSearch :cities="cities" @search="scrollToCatalog" />

    <!-- Section 1: Circular Category Showcase -->
    <section class="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
      <div class="mb-6 flex items-baseline justify-between">
        <h2 class="font-serif text-2xl font-normal tracking-tight text-[#2B2A28] sm:text-[28px]">
          Jelajahi Etalase
        </h2>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-xs font-medium text-[#6B655E] transition-colors hover:text-[#2B2A28]"
          @click="resetFilters(); scrollToCatalog()"
        >
          Lihat Semua
          <ArrowRight class="h-3.5 w-3.5" />
        </button>
      </div>

      <CategoryPills :counts="categoryCounts" @select="scrollToCatalog" />
    </section>

    <!-- Section 2: Main Catalog with Sidebar Filter -->
    <section id="katalog" class="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
      <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="font-serif text-2xl font-normal tracking-tight text-[#2B2A28] sm:text-[28px]">
            {{ filters.category === 'Semua' ? 'Etalase Koleksi Butik' : etalaseMeta[filters.category].title }}
          </h2>
          <p class="mt-1 text-xs text-[#8A837A]">
            {{ items.length }} koleksi tersusun rapi per kategori — siap pakai &amp; sudah termasuk dry-clean
          </p>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            v-if="hasActiveFilters"
            type="button"
            class="inline-flex items-center gap-1 rounded-full border border-[#D9D2C8] bg-white px-3 py-1.5 text-xs font-medium text-[#6B655E] transition-colors hover:border-[#2B2A28] hover:text-[#2B2A28]"
            @click="resetFilters"
          >
            <X class="h-3.5 w-3.5" />
            Reset Filter
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E3DC] bg-white px-3.5 py-2 text-xs font-medium text-[#2B2A28] hover:bg-[#EFECE7] lg:hidden"
            @click="showMobileFilter = !showMobileFilter"
          >
            <SlidersHorizontal class="h-3.5 w-3.5 text-[#556256]" />
            {{ showMobileFilter ? 'Tutup Filter' : 'Filter & Urutkan' }}
          </button>
        </div>
      </div>

      <!-- Quick Etalase Switcher Pills -->
      <div class="no-scrollbar mb-6 flex items-center gap-2 overflow-x-auto pb-1">
        <button
          v-for="tab in quickTabs"
          :key="tab"
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
          :class="
            filters.category === tab
              ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
              : 'border-[#E5DFD6] bg-white text-[#5C554E] hover:border-[#556256] hover:text-[#2B2A28]'
          "
          @click="filters.category = tab"
        >
          <span>{{ tab === 'Semua' ? 'Semua Etalase' : tab }}</span>
          <span
            class="rounded-full px-1.5 py-0.5 text-[10px]"
            :class="filters.category === tab ? 'bg-white/20 text-white' : 'bg-[#F3EFE9] text-[#6B655E]'"
          >
            {{ categoryCounts[tab] ?? 0 }}
          </span>
        </button>
      </div>

      <!-- Mobile Filter Drawer -->
      <div v-if="showMobileFilter" class="mb-6 lg:hidden">
        <FilterSidebar
          :max-catalog-price="maxCatalogPrice"
          :total-results="items.length"
        />
      </div>

      <!-- Sidebar + Grid -->
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div class="hidden lg:col-span-3 lg:block">
          <FilterSidebar
            :max-catalog-price="maxCatalogPrice"
            :total-results="items.length"
          />
        </div>

        <div class="lg:col-span-9">
          <!-- Loading -->
          <div
            v-if="pending && items.length === 0"
            class="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5"
          >
            <div v-for="n in 6" :key="n" class="rounded-2xl border border-[#ECE7DF] bg-white p-3 space-y-3">
              <div class="aspect-[3/4] animate-pulse rounded-xl bg-[#EFECE7]" />
              <div class="h-4 w-3/4 animate-pulse rounded bg-[#EFECE7]" />
              <div class="h-3 w-1/2 animate-pulse rounded bg-[#EFECE7]" />
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="items.length === 0"
            class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D9D2C8] bg-white px-6 py-16 text-center"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFECE7] text-[#6B655E]">
              <PackageSearch class="h-6 w-6" />
            </div>
            <h3 class="mt-4 font-serif text-lg text-[#2B2A28]">
              Busana tidak ditemukan
            </h3>
            <p class="mt-1 max-w-sm text-xs leading-relaxed text-[#8A837A]">
              Tidak ada kebaya, gaun, jas, atau sepatu yang cocok dengan kombinasi filter, lokasi, atau tanggal yang dipilih.
            </p>
            <button
              type="button"
              class="mt-5 inline-flex items-center gap-2 rounded-md bg-[#2B2A28] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#3F3D39]"
              @click="resetFilters"
            >
              <RotateCcw class="h-3.5 w-3.5" />
              Reset Filter
            </button>
          </div>

          <!-- Grouped Etalase View (when viewing "Semua Etalase") -->
          <div v-else-if="showGroupedEtalase" class="space-y-10">
            <div
              v-for="group in groupedByEtalase"
              :key="group.category"
              class="space-y-4"
            >
              <!-- Etalase Section Header -->
              <div class="flex flex-wrap items-end justify-between gap-2 border-b border-[#E8E3DC] pb-3">
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-serif text-xl font-normal text-[#2B2A28] sm:text-2xl">
                      {{ group.title }}
                    </h3>
                    <span class="rounded-full bg-[#EFECE7] px-2.5 py-0.5 text-[11px] font-medium text-[#556256]">
                      {{ group.items.length }} koleksi
                    </span>
                  </div>
                  <p class="mt-0.5 text-xs text-[#8A837A]">
                    {{ group.subtitle }}
                  </p>
                </div>

                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-xs font-medium text-[#556256] transition-colors hover:text-[#2B2A28]"
                  @click="selectEtalase(group.category)"
                >
                  Lihat Etalase
                  <ArrowRight class="h-3.5 w-3.5" />
                </button>
              </div>

              <!-- Uniform 2/3-Column Etalase Grid -->
              <div class="grid grid-cols-2 items-stretch gap-3.5 sm:grid-cols-3 sm:gap-5">
                <ItemCard
                  v-for="item in group.items"
                  :key="item.id"
                  :item="item"
                />
              </div>
            </div>
          </div>

          <!-- Focused Single-Etalase Grid -->
          <div
            v-else
            class="grid grid-cols-2 items-stretch gap-3.5 sm:grid-cols-3 sm:gap-5"
          >
            <ItemCard
              v-for="item in items"
              :key="item.id"
              :item="item"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3: Dual Editorial Promo Banners -->
    <section class="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
        <!-- Left Promo: Dusty Blush -->
        <div class="relative grid min-h-[220px] grid-cols-12 overflow-hidden rounded-2xl bg-[#E3CFC8]">
          <div class="col-span-5 h-full overflow-hidden bg-[#EFECE7]">
            <img
              src="/images/kebaya-butter-yellow.jpg"
              alt="Koleksi Kebaya Modern Wisuda"
              class="h-full w-full object-cover object-top"
            >
          </div>
          <div class="col-span-7 flex flex-col justify-center p-6 sm:p-8">
            <h3 class="font-serif text-2xl leading-tight text-[#2B2A28] sm:text-[26px]">
              Esensial<br>Wisuda &amp; Pesta
            </h3>
            <p class="mt-2 text-xs leading-relaxed text-[#5C534E]">
              Kebaya lengan panjang, full furing, &amp; dress sopan ramah hijab. Sudah termasuk dry-clean.
            </p>
            <div class="mt-5">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-md bg-[#2B2A28] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3F3D39]"
                @click="selectPromoCategory('Kebaya Modern')"
              >
                Lihat Kebaya
                <ArrowRight class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Right Promo: Warm Sand -->
        <div class="relative grid min-h-[220px] grid-cols-12 overflow-hidden rounded-2xl bg-[#DDD6CC]">
          <div class="col-span-7 flex flex-col justify-center p-6 sm:p-8">
            <h3 class="font-serif text-2xl leading-tight text-[#2B2A28] sm:text-[26px]">
              Dress Sopan &amp;<br>Gaun Pesta
            </h3>
            <p class="mt-2 text-xs leading-relaxed text-[#5C534E]">
              Koleksi gaun bridesmaid, kondangan, dan lamaran yang anggun &amp; ramah hijab siap pakai.
            </p>
            <div class="mt-5">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-md bg-[#2B2A28] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3F3D39]"
                @click="selectPromoCategory('Gaun Pesta')"
              >
                Lihat Gaun Pesta
                <ArrowRight class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div class="col-span-5 h-full overflow-hidden bg-[#EFECE7]">
            <img
              src="/images/dress-sage-brokat.jpg"
              alt="Sewakan dress dan kebaya modern Anda"
              class="h-full w-full object-cover object-top"
            >
          </div>
        </div>
      </div>
    </section>

    <!-- Section 4: New Arrivals -->
    <section id="terbaru" class="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
      <div class="mb-6 flex items-baseline justify-between">
        <h2 class="font-serif text-2xl font-normal tracking-tight text-[#2B2A28] sm:text-[28px]">
          Baru Masuk
        </h2>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-xs font-medium text-[#6B655E] transition-colors hover:text-[#2B2A28]"
          @click="filters.sort = 'newest'; filters.category = 'Semua'; scrollToCatalog()"
        >
          Lihat Semua
          <ArrowRight class="h-3.5 w-3.5" />
        </button>
      </div>

      <div class="grid grid-cols-2 items-stretch gap-3.5 md:grid-cols-4 md:gap-5">
        <ItemCard
          v-for="item in newestItems"
          :key="`new-${item.id}`"
          :item="item"
        />
      </div>
    </section>
  </div>
</template>
