<script setup lang="ts">
import { Calendar, ChevronLeft, ChevronRight, MapPin, Search } from 'lucide-vue-next'

const props = defineProps<{
  cities: string[]
}>()

const emit = defineEmits<{
  search: []
}>()

const { filters } = useCatalogFilters()
const { getOffsetIsoDate } = useFormatters()
const todayIso = getOffsetIsoDate(0)

const slides = [
  {
    line1: 'Kebaya & Dress Modern,',
    scriptWord: 'Anggun',
    line2Suffix: 'Berkesan',
    subtitle: 'Seruni Atelier — Sewa Kebaya Modern, Dress Pesta, Jas Pria & Sepatu Formal',
    ctaLabel: 'Jelajahi Koleksi',
    image: '/images/hero-modest.jpg',
    category: 'Semua' as const,
  },
  {
    line1: 'Jas Pria & Pantofel,',
    scriptWord: 'Gagah',
    line2Suffix: 'Siap Pakai',
    subtitle: 'Setelan Jas Slim-Fit, Sepatu Pantofel Kulit & High Heels Pesta',
    ctaLabel: 'Lihat Koleksi Jas Pria',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=950&q=85',
    category: 'Jas Pria' as const,
  },
  {
    line1: 'Dress Pesta Modern,',
    scriptWord: 'Elegan',
    line2Suffix: 'Tertutup',
    subtitle: 'Brokat Payet & Satin Couture — Ramah Hijab & Gratis Dry-Clean',
    ctaLabel: 'Lihat Dress Modern',
    image: '/images/dress-maroon-ribbon.jpg',
    category: 'Gaun Pesta' as const,
  },
]

const currentSlide = ref(0)
const activeSlide = computed(() => slides[currentSlide.value] ?? slides[0]!)
const touchStartX = ref<number | null>(null)
const touchStartY = ref<number | null>(null)
let autoSlideTimer: ReturnType<typeof setInterval> | null = null

function restartAutoSlide() {
  if (!import.meta.client) return
  if (autoSlideTimer) clearInterval(autoSlideTimer)
  autoSlideTimer = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % slides.length
  }, 5500)
}

function prevSlide() {
  currentSlide.value = (currentSlide.value - 1 + slides.length) % slides.length
  restartAutoSlide()
}

function nextSlide() {
  currentSlide.value = (currentSlide.value + 1) % slides.length
  restartAutoSlide()
}

function goToSlide(idx: number) {
  currentSlide.value = idx
  restartAutoSlide()
}

function handleTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
}

function handleTouchEnd(event: TouchEvent) {
  if (touchStartX.value === null || touchStartY.value === null) return
  const touch = event.changedTouches[0]
  if (!touch) return

  const deltaX = touch.clientX - touchStartX.value
  const deltaY = touch.clientY - touchStartY.value
  touchStartX.value = null
  touchStartY.value = null

  // Horizontal swipe threshold (ignore vertical page scroll)
  if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
    if (deltaX < 0) nextSlide()
    else prevSlide()
  }
}

onMounted(() => {
  restartAutoSlide()
})

onBeforeUnmount(() => {
  if (autoSlideTimer) {
    clearInterval(autoSlideTimer)
    autoSlideTimer = null
  }
})

function handleHeroCta() {
  filters.value.category = activeSlide.value.category
  emit('search')
}

function handleStartDateChange() {
  if (filters.value.startDate && filters.value.endDate && filters.value.endDate < filters.value.startDate) {
    filters.value.endDate = filters.value.startDate
  }
}

function submitSearch() {
  emit('search')
}
</script>

<template>
  <section class="bg-[#FAF8F5]">
    <!-- Editorial Split Hero Banner -->
    <div
      class="relative overflow-hidden bg-[#EAE5DE] touch-pan-y select-none"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="relative grid min-h-[360px] grid-cols-1 items-center gap-6 py-8 sm:min-h-[430px] sm:py-10 md:grid-cols-12 md:py-0">
          <!-- Left Editorial Typography -->
          <div class="z-10 text-left md:col-span-6 md:py-16 md:pl-8 lg:pl-12">
            <h1 class="font-serif text-4xl font-normal leading-[1.15] tracking-tight text-[#2B2A28] sm:text-5xl lg:text-[54px]">
              <span class="block">{{ activeSlide.line1 }}</span>
              <span class="mt-1 flex flex-wrap items-baseline gap-x-2.5">
                <span class="font-script text-5xl font-normal text-[#2B2A28] sm:text-6xl lg:text-[66px]">
                  {{ activeSlide.scriptWord }}
                </span>
                <span>{{ activeSlide.line2Suffix }}</span>
              </span>
            </h1>

            <p class="mt-4 text-sm font-normal tracking-wide text-[#6B655E]">
              {{ activeSlide.subtitle }}
            </p>

            <div class="mt-7">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-md bg-[#2B2A28] px-6 py-3 text-xs font-medium tracking-wide text-[#FAF8F5] shadow-sm transition-all hover:bg-[#3F3D39] active:scale-[0.99]"
                @click="handleHeroCta"
              >
                {{ activeSlide.ctaLabel }}
              </button>
            </div>
          </div>

          <!-- Right Editorial Visual -->
          <div class="relative flex items-end justify-center md:col-span-6 md:h-[440px]">
            <div class="relative h-72 w-full overflow-hidden rounded-2xl bg-[#EAE5DE] sm:h-80 md:h-full md:rounded-none">
              <img
                :src="activeSlide.image"
                :alt="activeSlide.subtitle"
                draggable="false"
                class="h-full w-full object-cover object-top transition-all duration-500"
              >
              <div class="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#EAE5DE]/60 via-transparent to-transparent md:from-[#EAE5DE]/35" />

              <!-- Mobile Carousel Arrows (visible on phone right over the photo) -->
              <button
                type="button"
                class="absolute left-2.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#2B2A28] shadow-sm backdrop-blur-sm transition-colors active:scale-95 md:hidden"
                aria-label="Slide sebelumnya"
                @click="prevSlide"
              >
                <ChevronLeft class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="absolute right-2.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#2B2A28] shadow-sm backdrop-blur-sm transition-colors active:scale-95 md:hidden"
                aria-label="Slide berikutnya"
                @click="nextSlide"
              >
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Desktop Carousel Arrows -->
          <button
            type="button"
            class="absolute left-0 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#2B2A28]/15 text-[#2B2A28] backdrop-blur-sm transition-colors hover:bg-[#2B2A28]/25 md:flex"
            aria-label="Slide sebelumnya"
            @click="prevSlide"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="absolute right-0 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#2B2A28]/15 text-[#2B2A28] backdrop-blur-sm transition-colors hover:bg-[#2B2A28]/25 md:flex"
            aria-label="Slide berikutnya"
            @click="nextSlide"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>

        <!-- Pagination Dots -->
        <div class="flex items-center justify-center gap-1 pb-4 md:pb-6">
          <button
            v-for="(slide, idx) in slides"
            :key="slide.subtitle"
            type="button"
            class="flex items-center justify-center p-1.5"
            :aria-label="`Tampilkan slide ${idx + 1}`"
            @click="goToSlide(idx)"
          >
            <span
              class="block h-1.5 rounded-full transition-all"
              :class="idx === currentSlide ? 'w-6 bg-[#2B2A28]' : 'w-1.5 bg-[#2B2A28]/30 hover:bg-[#2B2A28]/50'"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Clean Minimal Quick Search Bar -->
    <div id="pencarian" class="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <form
        class="rounded-2xl border border-[#E8E3DC] bg-white/90 p-3.5 shadow-sm backdrop-blur-sm sm:p-4"
        @submit.prevent="submitSearch"
      >
        <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
          <!-- Keyword -->
          <div class="md:col-span-4">
            <label for="hero-keyword" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
              Cari Busana Sopan
            </label>
            <div class="relative">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A837A]" />
              <input
                id="hero-keyword"
                v-model="filters.q"
                type="text"
                placeholder="Kebaya Sage, Jas Pria, High Heels, Pantofel..."
                class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] py-2.5 pl-9 pr-3 text-sm text-[#2B2A28] placeholder:text-[#A39C93] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
              >
            </div>
          </div>

          <!-- City -->
          <div class="md:col-span-3">
            <label for="hero-location" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
              Lokasi Kota
            </label>
            <div class="relative">
              <MapPin class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A837A]" />
              <select
                id="hero-location"
                v-model="filters.location"
                class="w-full appearance-none rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] py-2.5 pl-9 pr-8 text-sm text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
              >
                <option value="">
                  Semua Kota
                </option>
                <option v-for="city in props.cities" :key="city" :value="city">
                  {{ city }}
                </option>
              </select>
            </div>
          </div>

          <!-- Dates -->
          <div class="grid grid-cols-2 gap-2 md:col-span-3">
            <div>
              <label for="hero-start" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
                Mulai Sewa
              </label>
              <div class="relative">
                <Calendar class="pointer-events-none absolute left-2.5 top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-[#8A837A] sm:block" />
                <input
                  id="hero-start"
                  v-model="filters.startDate"
                  type="date"
                  :min="todayIso"
                  class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] py-2.5 pl-2.5 pr-2 text-xs text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256] sm:pl-8"
                  @change="handleStartDateChange"
                >
              </div>
            </div>
            <div>
              <label for="hero-end" class="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
                Selesai Sewa
              </label>
              <div class="relative">
                <Calendar class="pointer-events-none absolute left-2.5 top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-[#8A837A] sm:block" />
                <input
                  id="hero-end"
                  v-model="filters.endDate"
                  type="date"
                  :min="filters.startDate || todayIso"
                  class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] py-2.5 pl-2.5 pr-2 text-xs text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256] sm:pl-8"
                >
              </div>
            </div>
          </div>

          <!-- Search Button -->
          <div class="flex items-end md:col-span-2">
            <button
              type="submit"
              class="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-[#2B2A28] px-4 text-xs font-medium tracking-wide text-white transition-all hover:bg-[#3F3D39] active:scale-[0.99]"
            >
              <Search class="h-3.5 w-3.5" />
              Cari Busana
            </button>
          </div>
        </div>
      </form>
    </div>
  </section>
</template>
