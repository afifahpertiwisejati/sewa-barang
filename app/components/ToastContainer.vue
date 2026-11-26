<script setup lang="ts">
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-vue-next'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div
    class="pointer-events-none fixed bottom-24 right-4 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start gap-3 rounded-xl border bg-[#FAF8F5] p-4 shadow-lg backdrop-blur-md"
        :class="{
          'border-[#C7D1C5] text-[#2B2A28]': toast.type === 'success',
          'border-rose-200 text-[#2B2A28]': toast.type === 'error',
          'border-[#E2DCD3] text-[#2B2A28]': toast.type === 'info',
        }"
      >
        <CheckCircle2
          v-if="toast.type === 'success'"
          class="mt-0.5 h-5 w-5 shrink-0 text-[#556256]"
        />
        <AlertCircle
          v-else-if="toast.type === 'error'"
          class="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
        />
        <Info v-else class="mt-0.5 h-5 w-5 shrink-0 text-[#8D6E5E]" />

        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-[#2B2A28]">
            {{ toast.title }}
          </p>
          <p v-if="toast.description" class="mt-0.5 text-xs leading-relaxed text-[#6B655E]">
            {{ toast.description }}
          </p>
        </div>

        <button
          type="button"
          class="rounded-lg p-1 text-[#8A837A] transition-colors hover:bg-[#EFECE7] hover:text-[#2B2A28]"
          aria-label="Tutup notifikasi"
          @click="dismiss(toast.id)"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
