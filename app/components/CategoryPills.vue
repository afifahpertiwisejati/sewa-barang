<script setup lang="ts">
import type { CategoryFilter } from '#shared/types/rental'

const props = defineProps<{
  counts?: Record<string, number>
}>()

const emit = defineEmits<{
  select: [category: CategoryFilter]
}>()

const { filters } = useCatalogFilters()

const categories: {
  label: CategoryFilter
  shortLabel: string
  image: string
  bgClass: string
}[] = [
  {
    label: 'Semua',
    shortLabel: 'Semua Etalase',
    image: '/images/dress-sage-brokat.jpg',
    bgClass: 'bg-[#E5DDD5]',
  },
  {
    label: 'Kebaya Wisuda',
    shortLabel: 'Kebaya Modern',
    image: '/images/kebaya-burgundy-couture.jpg',
    bgClass: 'bg-[#DFC9C2]',
  },
  {
    label: 'Gaun Pesta',
    shortLabel: 'Gaun Pesta',
    image: '/images/dress-maroon-ribbon.jpg',
    bgClass: 'bg-[#D7DDD5]',
  },
  {
    label: 'Jas Pria',
    shortLabel: 'Jas Pria',
    image: '/images/jas-hitam-1.jpg',
    bgClass: 'bg-[#D9D5CE]',
  },
  {
    label: 'High Heels',
    shortLabel: 'High Heels',
    image: '/images/heels-ivory-pearl.jpg',
    bgClass: 'bg-[#E3CFC8]',
  },
  {
    label: 'Sepatu Pantofel',
    shortLabel: 'Sepatu Pantofel',
    image: '/images/pantofel-oxford-hitam.jpg',
    bgClass: 'bg-[#DFD7CC]',
  },
]

function handleSelect(cat: CategoryFilter) {
  filters.value.category = cat
  emit('select', cat)
}
</script>

<template>
  <div class="no-scrollbar flex items-start gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-6 md:grid-cols-6">
    <button
      v-for="cat in categories"
      :key="cat.label"
      type="button"
      class="group flex w-24 shrink-0 flex-col items-center text-center focus:outline-none sm:w-auto"
      @click="handleSelect(cat.label)"
    >
      <div
        class="relative h-20 w-20 overflow-hidden rounded-full p-1 transition-all duration-300 sm:h-24 sm:w-24"
        :class="[
          cat.bgClass,
          filters.category === cat.label
            ? 'ring-2 ring-[#2B2A28] ring-offset-2 ring-offset-[#FAF8F5]'
            : 'ring-1 ring-[#E8E3DC] group-hover:ring-[#556256]',
        ]"
      >
        <img
          :src="cat.image"
          :alt="cat.label"
          loading="lazy"
          class="h-full w-full rounded-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        >
      </div>
      <span
        class="mt-2.5 text-xs tracking-wide transition-colors sm:text-[13px]"
        :class="
          filters.category === cat.label
            ? 'font-semibold text-[#2B2A28]'
            : 'font-medium text-[#6B655E] group-hover:text-[#2B2A28]'
        "
      >
        {{ cat.shortLabel }}
      </span>
      <span
        v-if="props.counts && props.counts[cat.label] !== undefined"
        class="mt-0.5 text-[10.5px] text-[#8A837A]"
      >
        {{ props.counts[cat.label] }} koleksi
      </span>
    </button>
  </div>
</template>
