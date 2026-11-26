<script setup lang="ts">
import { Heart, MapPin, ShoppingBag, Star } from 'lucide-vue-next'
import type { RentalItem } from '#shared/types/rental'

const props = defineProps<{
  item: RentalItem
}>()

const { formatRupiah } = useFormatters()
const { isLiked, toggleLike } = useWishlist()
const toast = useToast()

const imageError = ref(false)
const fallbackImage = '/images/kebaya-sage.jpg'
const previewColorName = ref('')

const liked = computed(() => isLiked(props.item.id))

const activeColorVariant = computed(() => {
  if (!props.item.colors?.length) return null
  if (!previewColorName.value) return props.item.colors[0] ?? null
  return props.item.colors.find(c => c.name === previewColorName.value) ?? props.item.colors[0] ?? null
})

const displayImageUrl = computed(() => {
  if (imageError.value) return fallbackImage
  if (previewColorName.value && activeColorVariant.value?.imageUrl) {
    return activeColorVariant.value.imageUrl
  }
  return props.item.imageUrl || fallbackImage
})

const itemDetailLink = computed(() => {
  if (previewColorName.value) {
    return {
      path: `/items/${props.item.id}`,
      query: { color: previewColorName.value },
    }
  }
  return `/items/${props.item.id}`
})

const displayName = computed(() => {
  const raw = props.item.name.trim()
  if (!raw) return ''
  // Format all-lowercase titles into clean Title Case while preserving intentional mixed casing
  if (raw === raw.toLowerCase()) {
    return raw.replace(/\b\w/g, char => char.toUpperCase())
  }
  return raw
})

const displaySizes = computed(() => {
  const variantSizes = previewColorName.value && activeColorVariant.value?.sizes
    ? activeColorVariant.value.sizes
    : props.item.sizes ?? []
  if (variantSizes.length === 0) return 'Habis'
  if (variantSizes.length <= 4) return variantSizes.join(' · ')
  return `${variantSizes.slice(0, 3).join(' · ')} +${variantSizes.length - 3}`
})

function selectPreviewColor(colorName: string) {
  previewColorName.value = colorName
  imageError.value = false
}

function handleToggleLike() {
  toggleLike(props.item.id)
  if (isLiked(props.item.id)) {
    toast.push('Disimpan ke Favorit', {
      description: displayName.value,
      type: 'info',
      duration: 2200,
    })
  }
}
</script>

<template>
  <NuxtLink
    :to="itemDetailLink"
    class="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#ECE7DF] bg-white p-2.5 shadow-[0_1px_2px_rgba(43,42,40,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D6CEC2] hover:shadow-md sm:p-3"
  >
    <!-- Uniform Aspect-Ratio Studio Image Box -->
    <div class="relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-xl bg-[#F2EFEA]">
      <img
        :src="displayImageUrl"
        :alt="previewColorName ? `${displayName} — ${previewColorName}` : displayName"
        loading="lazy"
        class="h-full w-full object-cover object-top transition-all duration-300 group-hover:scale-105"
        @error="imageError = true"
      >

      <!-- Top-Left Status Pill -->
      <span
        class="absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-white shadow-sm"
        :class="
          props.item.status === 'Tersedia'
            ? 'bg-[#5F705D]/95'
            : 'bg-[#9E7B6B]/95'
        "
      >
        {{ props.item.status }}
      </span>

      <!-- Top-Right Heart Button -->
      <button
        type="button"
        class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#2B2A28] shadow-sm backdrop-blur-sm transition-all hover:bg-white sm:h-8 sm:w-8"
        :aria-label="liked ? 'Hapus dari favorit' : 'Simpan ke favorit'"
        @click.prevent.stop="handleToggleLike"
      >
        <Heart
          class="h-3.5 w-3.5 transition-colors sm:h-4 sm:w-4"
          :class="liked ? 'fill-[#B47A6C] text-[#B47A6C]' : 'text-[#6B655E]'"
          stroke-width="1.75"
        />
      </button>

      <!-- Subtle Size Pill Bottom Left -->
      <div
        v-if="displaySizes"
        class="absolute bottom-2 left-2 max-w-[58%] truncate rounded-md bg-[#FAF8F5]/92 px-2 py-0.5 text-[10px] font-medium text-[#2B2A28] shadow-sm backdrop-blur-sm"
      >
        <template v-if="previewColorName">{{ previewColorName }} · </template>{{ displaySizes === 'Habis' ? 'Stok Habis' : `Size ${displaySizes}` }}
      </div>

      <!-- Interactive Color Swatch Dots Bottom Right (for multi-color models) -->
      <div
        v-if="props.item.colors && props.item.colors.length > 1"
        class="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-1 shadow-sm backdrop-blur-sm"
        :title="`${props.item.colors.length} pilihan warna — klik untuk pratinjau`"
      >
        <button
          v-for="c in props.item.colors.slice(0, 6)"
          :key="c.name"
          type="button"
          class="h-2.5 w-2.5 rounded-full border transition-transform hover:scale-125 sm:h-3 sm:w-3"
          :class="
            (previewColorName ? previewColorName === c.name : props.item.colors[0]?.name === c.name)
              ? 'scale-110 border-[#2B2A28] ring-1 ring-[#2B2A28] ring-offset-1'
              : 'border-black/20'
          "
          :style="{ backgroundColor: c.hex }"
          :title="`Warna ${c.name}`"
          :aria-label="`Pratinjau warna ${c.name}`"
          @click.prevent.stop="selectPreviewColor(c.name)"
          @mouseenter="selectPreviewColor(c.name)"
        />
      </div>
    </div>

    <!-- Uniform Aligned Card Details -->
    <div class="flex flex-1 flex-col px-0.5 pt-3">
      <!-- Category Tag -->
      <span class="text-[10px] font-medium uppercase tracking-wider text-[#8A837A]">
        {{ props.item.category }}
      </span>

      <!-- Fixed 2-Line Title Slot so all rows align perfectly -->
      <h3 class="mt-1 line-clamp-2 min-h-[2.4rem] text-[13px] font-medium leading-[1.2rem] text-[#2B2A28] transition-colors group-hover:text-[#556256] sm:min-h-[2.5rem] sm:text-sm sm:leading-[1.25rem]">
        {{ displayName }}
      </h3>

      <!-- Bottom-Pinned Metadata & Price -->
      <div class="mt-auto pt-2">
        <!-- Stars + City -->
        <div class="flex items-center justify-between gap-1.5 text-[11px] text-[#8A837A]">
          <div class="flex shrink-0 items-center gap-0.5">
            <Star
              class="h-3 w-3 fill-[#C8A26A] text-[#C8A26A]"
            />
            <span class="ml-0.5 font-medium text-[#6B655E]">
              {{ props.item.rating.toFixed(1) }}
            </span>
            <span class="text-[#A39C93]">({{ props.item.reviewCount }})</span>
          </div>

          <span class="inline-flex min-w-0 items-center gap-0.5 truncate text-[10.5px] text-[#8A837A]">
            <MapPin class="h-3 w-3 shrink-0" />
            <span class="truncate">{{ props.item.location }}</span>
          </span>
        </div>

        <!-- Price + Bag Icon -->
        <div class="mt-2.5 flex items-center justify-between border-t border-[#F3EFE9] pt-2.5">
          <div class="min-w-0">
            <p class="truncate text-[13px] font-semibold text-[#2B2A28] sm:text-[15px]">
              {{ formatRupiah(props.item.pricePerDay) }}<span class="text-[10px] font-normal text-[#8A837A] sm:text-[11px]">/hari</span>
            </p>
          </div>

          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EFECE7] text-[#2B2A28] transition-colors group-hover:bg-[#2B2A28] group-hover:text-white sm:h-8 sm:w-8"
            title="Lihat detail & sewa"
          >
            <ShoppingBag class="h-3.5 w-3.5" stroke-width="1.75" />
          </span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
