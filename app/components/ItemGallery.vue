<script setup lang="ts">
import { Images } from 'lucide-vue-next'
import type { ItemColorVariant } from '#shared/types/rental'

const props = defineProps<{
  name: string
  images: string[]
  colors?: ItemColorVariant[]
  selectedColor?: string
}>()

const emit = defineEmits<{
  'update:selectedColor': [color: string]
}>()

const activeIndex = ref(0)
const failedIndices = ref<Record<number, boolean>>({})

const fallbackImage = '/images/kebaya-sage.jpg'

const hasColors = computed(() => Boolean(props.colors && props.colors.length > 0))

const slides = computed(() => {
  if (props.colors && props.colors.length > 0) {
    return props.colors.map(c => ({
      imageUrl: c.imageUrl,
      colorName: c.name,
      hex: c.hex,
    }))
  }
  const imgs = props.images.length > 0 ? props.images : [fallbackImage]
  return imgs.map(url => ({
    imageUrl: url,
    colorName: '',
    hex: '',
  }))
})

const currentSlide = computed(() => slides.value[activeIndex.value] ?? slides.value[0]!)
const currentSrc = computed(() => {
  if (failedIndices.value[activeIndex.value]) return fallbackImage
  return currentSlide.value.imageUrl || fallbackImage
})

watch(
  () => props.selectedColor,
  (colorName) => {
    if (!colorName || !props.colors?.length) return
    const idx = props.colors.findIndex(c => c.name === colorName)
    if (idx !== -1 && idx !== activeIndex.value) {
      activeIndex.value = idx
    }
  },
  { immediate: true },
)

watch(() => props.images, () => {
  if (!hasColors.value) {
    activeIndex.value = 0
  }
  failedIndices.value = {}
})

function selectSlide(idx: number) {
  activeIndex.value = idx
  const slide = slides.value[idx]
  if (slide?.colorName) {
    emit('update:selectedColor', slide.colorName)
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- Main Studio Frame (explicit h-full w-full object-contain for Firefox & Chrome compatibility) -->
    <div
      class="relative w-full overflow-hidden rounded-2xl border border-[#E8E3DC]/80 bg-[#F4F1EC] p-3"
      style="height: 520px;"
    >
      <img
        :src="currentSrc"
        :alt="currentSlide.colorName ? `${props.name} — Warna ${currentSlide.colorName}` : props.name"
        class="h-full w-full rounded-xl object-contain transition-all duration-300"
        style="width: 100%; height: 100%; object-fit: contain;"
        @error="failedIndices[activeIndex] = true"
      >

      <!-- Active Color Pill (Bottom-Left) -->
      <div
        v-if="currentSlide.colorName"
        class="absolute bottom-3.5 left-3.5 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#2B2A28] shadow-sm ring-1 ring-[#E8E3DC] backdrop-blur-sm"
      >
        <span
          class="h-3 w-3 rounded-full border border-black/15"
          :style="{ backgroundColor: currentSlide.hex }"
        />
        <span>Warna: {{ currentSlide.colorName }}</span>
      </div>

      <!-- Counter Pill (Bottom-Right) -->
      <div
        class="absolute bottom-3.5 right-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#2B2A28]/75 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
      >
        <Images class="h-3.5 w-3.5" />
        {{ activeIndex + 1 }} / {{ slides.length }}
      </div>
    </div>

    <!-- Thumbnails (color slides or gallery photos) -->
    <div
      v-if="slides.length > 1"
      class="grid gap-2.5"
      :class="slides.length >= 7 ? 'grid-cols-4 sm:grid-cols-7' : slides.length >= 6 ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-4 sm:grid-cols-5'"
    >
      <button
        v-for="(slide, idx) in slides"
        :key="`${slide.imageUrl}-${idx}`"
        type="button"
        class="group relative flex flex-col overflow-hidden rounded-xl border-2 bg-[#F4F1EC] transition-all"
        :class="
          idx === activeIndex
            ? 'border-[#2B2A28] ring-1 ring-[#2B2A28]'
            : 'border-[#E8E3DC] opacity-80 hover:border-[#556256] hover:opacity-100'
        "
        @click="selectSlide(idx)"
      >
        <div class="aspect-[3/4] w-full p-1">
          <img
            :src="failedIndices[idx] ? fallbackImage : slide.imageUrl"
            :alt="slide.colorName ? `${props.name} warna ${slide.colorName}` : `${props.name} foto ${idx + 1}`"
            class="h-full w-full rounded-md object-contain"
            style="width: 100%; height: 100%; object-fit: contain;"
            @error="failedIndices[idx] = true"
          >
        </div>
        <div
          v-if="slide.colorName"
          class="flex items-center justify-center gap-1 border-t border-[#E8E3DC] bg-white px-1.5 py-1 text-[10px] font-medium text-[#2B2A28]"
        >
          <span
            class="h-2.5 w-2.5 shrink-0 rounded-full border border-black/15"
            :style="{ backgroundColor: slide.hex }"
          />
          <span class="truncate">{{ slide.colorName }}</span>
        </div>
      </button>
    </div>
  </div>
</template>
