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

const liked = computed(() => isLiked(props.item.id))

function handleToggleLike() {
  toggleLike(props.item.id)
  if (isLiked(props.item.id)) {
    toast.push('Disimpan ke Favorit', {
      description: props.item.name,
      type: 'info',
      duration: 2200,
    })
  }
}
</script>

<template>
  <NuxtLink
    :to="`/items/${props.item.id}`"
    class="group flex flex-col"
  >
    <!-- Clean Studio Image Box -->
    <div class="relative aspect-[3/3.7] w-full overflow-hidden rounded-xl bg-[#EFECE7]">
      <img
        :src="imageError ? fallbackImage : props.item.imageUrl"
        :alt="props.item.name"
        loading="lazy"
        class="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        @error="imageError = true"
      >

      <!-- Top-Left Status Pill -->
      <span
        class="absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-white shadow-sm"
        :class="
          props.item.status === 'Tersedia'
            ? 'bg-[#6F7F6C]'
            : 'bg-[#9E7B6B]'
        "
      >
        {{ props.item.status }}
      </span>

      <!-- Top-Right Heart Button -->
      <button
        type="button"
        class="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[#2B2A28] backdrop-blur-sm transition-all hover:bg-white"
        :aria-label="liked ? 'Hapus dari favorit' : 'Simpan ke favorit'"
        @click.prevent.stop="handleToggleLike"
      >
        <Heart
          class="h-4 w-4 transition-colors"
          :class="liked ? 'fill-[#B47A6C] text-[#B47A6C]' : 'text-[#6B655E]'"
          stroke-width="1.75"
        />
      </button>

      <!-- Subtle Size Pill Bottom Left -->
      <div
        v-if="props.item.sizes?.length"
        class="absolute bottom-2.5 left-2.5 rounded-md bg-[#FAF8F5]/90 px-2 py-0.5 text-[10px] font-medium text-[#2B2A28] backdrop-blur-sm"
      >
        Size {{ props.item.sizes.join(' · ') }}
      </div>

      <!-- Color Swatch Dots Bottom Right (for multi-color models) -->
      <div
        v-if="props.item.colors && props.item.colors.length > 1"
        class="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm"
        :title="`${props.item.colors.length} pilihan warna`"
      >
        <span
          v-for="c in props.item.colors"
          :key="c.name"
          class="h-2.5 w-2.5 rounded-full border border-black/20"
          :style="{ backgroundColor: c.hex }"
        />
      </div>
    </div>

    <!-- Minimalist Details -->
    <div class="flex flex-1 flex-col pt-3">
      <h3 class="line-clamp-2 text-[13px] font-medium leading-snug text-[#2B2A28] transition-colors group-hover:text-[#556256] sm:text-sm">
        {{ props.item.name }}
      </h3>

      <!-- Stars + City -->
      <div class="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-[#8A837A]">
        <div class="flex items-center gap-0.5">
          <Star
            v-for="n in 5"
            :key="n"
            class="h-3 w-3"
            :class="n <= Math.round(props.item.rating) ? 'fill-[#C8A26A] text-[#C8A26A]' : 'text-[#DDD6CC]'"
          />
          <span class="ml-1 font-medium text-[#6B655E]">
            {{ props.item.rating.toFixed(1) }}
          </span>
          <span class="text-[#A39C93]">({{ props.item.reviewCount }})</span>
        </div>

        <span class="inline-flex items-center gap-0.5 truncate text-[11px] text-[#8A837A]">
          <MapPin class="h-3 w-3 shrink-0" />
          {{ props.item.location }}
        </span>
      </div>

      <!-- Price + Bag Icon -->
      <div class="mt-2.5 flex items-center justify-between pt-0.5">
        <p class="text-sm font-semibold text-[#2B2A28] sm:text-[15px]">
          {{ formatRupiah(props.item.pricePerDay) }}
          <span class="text-[11px] font-normal text-[#8A837A]">/hari</span>
        </p>

        <span
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFECE7] text-[#2B2A28] transition-colors group-hover:bg-[#2B2A28] group-hover:text-white"
          title="Lihat detail & sewa"
        >
          <ShoppingBag class="h-3.5 w-3.5" stroke-width="1.75" />
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
