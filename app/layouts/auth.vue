<script setup lang="ts">
import { FileText, Ruler } from 'lucide-vue-next'

const { openSizeGuide } = useSizeGuide()
const showTermsModal = ref(false)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#FAF8F5] text-[#2B2A28]">
    <!-- Minimalist Boutique Auth Header -->
    <header class="border-b border-[#E8E3DC] bg-[#FAF8F5]/95 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-5 sm:px-6 lg:px-8">
        <div class="flex items-center gap-2.5">
          <span class="font-serif text-xl font-medium tracking-tight text-[#2B2A28] sm:text-2xl">
            Seruni <span class="italic text-[#556256]">Atelier</span>
          </span>
          <span class="hidden rounded-full border border-[#E2DCD3] bg-white px-2.5 py-0.5 text-[10.5px] font-medium text-[#6B655E] sm:inline-flex">
            Sewa Busana Formal &amp; Pesta
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E3DC] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#5C554E] transition-colors hover:border-[#556256] hover:text-[#2B2A28]"
            @click="openSizeGuide('wanita')"
          >
            <Ruler class="h-3.5 w-3.5 text-[#556256]" />
            <span class="hidden sm:inline">Panduan Ukuran</span>
            <span class="sm:hidden">Ukuran</span>
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E3DC] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#5C554E] transition-colors hover:border-[#556256] hover:text-[#2B2A28]"
            @click="showTermsModal = true"
          >
            <FileText class="h-3.5 w-3.5 text-[#556256]" />
            <span>Cara Sewa &amp; S&amp;K</span>
          </button>
        </div>
      </div>
    </header>

    <main class="flex flex-1 items-center justify-center">
      <div class="w-full">
        <slot />
      </div>
    </main>

    <footer class="border-t border-[#E8E3DC] bg-[#FAF8F5] py-4 text-center text-[11px] text-[#8A837A]">
      &copy; {{ new Date().getFullYear() }} Seruni Atelier &bull; Sewa Kebaya Modern, Gaun Pesta, Jas Pria &amp; Sepatu Formal
    </footer>

    <TermsModal :open="showTermsModal" @close="showTermsModal = false" />
    <ToastContainer />
  </div>
</template>
