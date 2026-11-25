<script setup lang="ts">
import { CalendarDays, CheckCircle2, MapPin, MessageCircle, ShieldCheck } from 'lucide-vue-next'
import type { ItemOwner } from '#shared/types/rental'

const props = defineProps<{
  owner: ItemOwner
}>()
</script>

<template>
  <div class="rounded-2xl border border-[#E8E3DC] bg-white p-5">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#556256] font-serif text-base font-medium text-white"
        >
          {{ props.owner.avatarInitials }}
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-base font-semibold text-[#2B2A28]">
              {{ props.owner.name }}
            </h3>
            <span
              v-if="props.owner.verified"
              class="inline-flex items-center gap-1 rounded-full bg-[#F3F5F2] px-2.5 py-0.5 text-[11px] font-medium text-[#556256] ring-1 ring-[#D7E0D5]"
            >
              <ShieldCheck class="h-3.5 w-3.5" />
              Pemilik Terverifikasi
            </span>
          </div>
          <p class="mt-0.5 flex items-center gap-1 text-xs text-[#8A837A]">
            <MapPin class="h-3.5 w-3.5" />
            {{ props.owner.city }} &bull; Bergabung sejak {{ props.owner.joinedYear }}
          </p>
        </div>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-3 gap-2.5 border-t border-[#EFECE7] pt-4 text-center">
      <div class="rounded-xl bg-[#FAF8F5] px-2 py-2.5">
        <div class="flex items-center justify-center gap-1 text-sm font-semibold text-[#2B2A28]">
          <MessageCircle class="h-3.5 w-3.5 text-[#556256]" />
          {{ props.owner.responseRate }}%
        </div>
        <p class="mt-0.5 text-[11px] text-[#8A837A]">
          Tingkat Respon
        </p>
      </div>
      <div class="rounded-xl bg-[#FAF8F5] px-2 py-2.5">
        <div class="flex items-center justify-center gap-1 text-sm font-semibold text-[#2B2A28]">
          <CheckCircle2 class="h-3.5 w-3.5 text-[#556256]" />
          {{ props.owner.totalRentals }}+
        </div>
        <p class="mt-0.5 text-[11px] text-[#8A837A]">
          Sewa Selesai
        </p>
      </div>
      <div class="rounded-xl bg-[#FAF8F5] px-2 py-2.5">
        <div class="flex items-center justify-center gap-1 text-sm font-semibold text-[#2B2A28]">
          <CalendarDays class="h-3.5 w-3.5 text-[#556256]" />
          {{ props.owner.joinedYear }}
        </div>
        <p class="mt-0.5 text-[11px] text-[#8A837A]">
          Anggota Sejak
        </p>
      </div>
    </div>
  </div>
</template>
