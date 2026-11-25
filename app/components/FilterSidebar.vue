<script setup lang="ts">
import { ArrowUpDown, RotateCcw, SlidersHorizontal } from 'lucide-vue-next'
import type { SortOption } from '#shared/types/rental'
import { DEFAULT_MAX_PRICE } from '../composables/useCatalogFilters'

const props = defineProps<{
  maxCatalogPrice: number
  totalResults: number
}>()

const { filters, hasActiveFilters, resetFilters } = useCatalogFilters()
const { formatRupiah } = useFormatters()

const sliderMax = computed(() => Math.max(DEFAULT_MAX_PRICE, Math.ceil(props.maxCatalogPrice / 25000) * 25000))

const pricePresets = [
  { label: '≤ Rp50rb', value: 50000 },
  { label: '≤ Rp100rb', value: 100000 },
  { label: '≤ Rp150rb', value: 150000 },
  { label: 'Semua', value: DEFAULT_MAX_PRICE },
]

const sortOptions: { value: SortOption, label: string }[] = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'rating_desc', label: 'Rating Tertinggi' },
]
</script>

<template>
  <aside class="rounded-2xl border border-[#E8E3DC] bg-white p-5 lg:sticky lg:top-24">
    <div class="flex items-center justify-between border-b border-[#EFECE7] pb-4">
      <div class="flex items-center gap-2">
        <SlidersHorizontal class="h-4 w-4 text-[#556256]" />
        <h2 class="font-serif text-base font-medium text-[#2B2A28]">
          Filter &amp; Urutkan
        </h2>
      </div>
      <button
        v-if="hasActiveFilters"
        type="button"
        class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#556256] transition-colors hover:bg-[#F3F5F2]"
        @click="resetFilters"
      >
        <RotateCcw class="h-3.5 w-3.5" />
        Reset
      </button>
    </div>

    <!-- Sort -->
    <div class="mt-5">
      <label for="sidebar-sort" class="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
        <ArrowUpDown class="h-3.5 w-3.5" />
        Urutkan
      </label>
      <select
        id="sidebar-sort"
        v-model="filters.sort"
        class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3 py-2.5 text-sm font-medium text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
      >
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- Max Price per Day -->
    <div class="mt-6">
      <div class="flex items-center justify-between">
        <label for="sidebar-max-price" class="text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
          Harga Maks / Hari
        </label>
        <span class="text-xs font-semibold text-[#556256]">
          {{ filters.maxPrice >= sliderMax ? 'Semua' : formatRupiah(filters.maxPrice) }}
        </span>
      </div>

      <input
        id="sidebar-max-price"
        v-model.number="filters.maxPrice"
        type="range"
        :min="25000"
        :max="sliderMax"
        :step="5000"
        class="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#E8E3DC] accent-[#556256]"
      >

      <div class="mt-1.5 flex justify-between text-[11px] text-[#8A837A]">
        <span>Rp25rb</span>
        <span>{{ formatRupiah(sliderMax) }}</span>
      </div>

      <!-- Quick Presets -->
      <div class="mt-3 grid grid-cols-2 gap-1.5">
        <button
          v-for="preset in pricePresets"
          :key="preset.label"
          type="button"
          class="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
          :class="
            filters.maxPrice === preset.value
              ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
              : 'border-[#E8E3DC] bg-[#FAF8F5] text-[#6B655E] hover:border-[#C7D1C5] hover:text-[#2B2A28]'
          "
          @click="filters.maxPrice = preset.value"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <!-- Availability Toggle -->
    <div class="mt-6 border-t border-[#EFECE7] pt-5">
      <label class="flex cursor-pointer items-center justify-between gap-3">
        <div>
          <span class="block text-sm font-medium text-[#2B2A28]">Hanya yang Tersedia</span>
          <span class="block text-xs text-[#8A837A]">Sembunyikan yang sedang disewa</span>
        </div>
        <input
          v-model="filters.availableOnly"
          type="checkbox"
          class="h-4 w-4 rounded border-[#D9D2C8] text-[#556256] accent-[#556256] focus:ring-[#556256]"
        >
      </label>
    </div>

    <!-- Count -->
    <div class="mt-6 rounded-xl bg-[#FAF8F5] px-3.5 py-2.5 text-center text-xs text-[#6B655E]">
      Menampilkan <span class="font-semibold text-[#2B2A28]">{{ props.totalResults }}</span> barang pilihan
    </div>
  </aside>
</template>
