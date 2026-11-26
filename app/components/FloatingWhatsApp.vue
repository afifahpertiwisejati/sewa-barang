<script setup lang="ts">
import {
  CalendarClock,
  Camera,
  Clock,
  MessageCircle,
  Ruler,
  Send,
  Sparkles,
  Truck,
  X,
} from 'lucide-vue-next'

const route = useRoute()
const {
  isOpen,
  activeProduct,
  draftMessage,
  displayPhone,
  closeWidget,
  buildWhatsAppUrl,
} = useWhatsAppConsult()
const { openSizeGuide } = useSizeGuide()

const isHiddenRoute = computed(() => route.path.startsWith('/admin'))

const productMention = computed(() => {
  if (!activeProduct.value) return ''
  return ` "${activeProduct.value.name}"`
})

const quickTopics = computed(() => [
  {
    id: 'size',
    label: 'Tanya Ukuran & Lingkar Dada (LD)',
    desc: 'Konsultasi size S–XXL yang pas di badan',
    icon: Ruler,
    message: activeProduct.value
      ? `Halo Admin Seruni Atelier, saya ingin konsultasi ukuran (LD/pinggang) untuk busana${productMention.value}. Kira-kira size apa yang cocok ya?`
      : 'Halo Admin Seruni Atelier, saya ingin konsultasi ukuran (LD/pinggang) agar pas saat dipakai acara.',
  },
  {
    id: 'realpic',
    label: 'Minta Real Picture / Video Detail',
    desc: 'Lihat warna asli, bahan brokat & payet',
    icon: Camera,
    message: activeProduct.value
      ? `Halo Admin Seruni Atelier, boleh minta real picture atau video detail bahan untuk${productMention.value}?`
      : 'Halo Admin Seruni Atelier, boleh minta real picture / video detail koleksi kebaya atau gaun yang tersedia?',
  },
  {
    id: 'fitting',
    label: 'Jadwal Fitting & Ketersediaan',
    desc: 'Cek jadwal kosong atau janji temu di butik',
    icon: CalendarClock,
    message: activeProduct.value
      ? `Halo Admin Seruni Atelier, saya ingin menanyakan jadwal fitting di butik dan ketersediaan tanggal sewa untuk${productMention.value}.`
      : 'Halo Admin Seruni Atelier, saya ingin menanyakan jadwal fitting di butik dan ketersediaan busana untuk tanggal acara saya.',
  },
  {
    id: 'delivery',
    label: 'Info Ambil, Kurir & Deposit',
    desc: 'Pengambilan butik, kurir antar & refund deposit',
    icon: Truck,
    message: activeProduct.value
      ? `Halo Admin Seruni Atelier, saya mau tanya info pengambilan/kurir antar serta deposit untuk sewa${productMention.value}.`
      : 'Halo Admin Seruni Atelier, saya ingin bertanya seputar cara sewa, pengiriman kurir, dan pengembalian deposit.',
  },
])

function selectTopic(message: string) {
  draftMessage.value = message
}

function sendToWhatsApp(customText?: string) {
  const text = (customText ?? draftMessage.value).trim()
    || (activeProduct.value
      ? `Halo Admin Seruni Atelier, saya tertarik menyewa${productMention.value}. Boleh dibantu info lebih lanjut?`
      : 'Halo Admin Seruni Atelier, saya ingin konsultasi sewa kebaya / gaun pesta.')

  if (import.meta.client) {
    window.open(buildWhatsAppUrl(text), '_blank', 'noopener,noreferrer')
  }
}

function openSizeChartFromChat() {
  closeWidget()
  openSizeGuide(activeProduct.value?.category || 'wanita')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    closeWidget()
  }
}

watch(() => route.fullPath, () => {
  closeWidget()
})

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div v-if="!isHiddenRoute" class="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
    <!-- Consultation Popover Panel -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-3 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="translate-y-2 opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="w-[calc(100vw-2.5rem)] max-w-[360px] overflow-hidden rounded-2xl border border-[#E2DCD3] bg-white shadow-2xl"
        role="dialog"
        aria-label="Konsultasi WhatsApp Admin Seruni Atelier"
      >
        <!-- Header -->
        <div class="flex items-center justify-between bg-[#556256] px-4 py-3.5 text-white">
          <div class="flex items-center gap-3">
            <div class="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 font-serif text-base font-medium text-white">
              SA
              <span class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#556256] bg-[#25D366]" />
            </div>
            <div>
              <h3 class="text-sm font-semibold leading-tight text-white">
                Admin Seruni Atelier
              </h3>
              <p class="mt-0.5 flex items-center gap-1 text-[11px] text-[#DCE4DB]">
                <Clock class="h-3 w-3" />
                Online &bull; {{ displayPhone }}
              </p>
            </div>
          </div>

          <button
            type="button"
            class="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            aria-label="Tutup konsultasi"
            @click="closeWidget"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="max-h-[70vh] space-y-3.5 overflow-y-auto bg-[#FAF8F5] p-4">
          <!-- Welcome bubble -->
          <div class="rounded-xl rounded-tl-sm border border-[#E8E3DC] bg-white px-3.5 py-2.5 text-xs leading-relaxed text-[#2B2A28] shadow-sm">
            <p class="font-medium text-[#2B2A28]">
              Halo Kak! Ada yang bisa kami bantu?
            </p>
            <p class="mt-1 text-[11.5px] text-[#6B655E]">
              Ragu soal lingkar dada, butuh <strong>real picture</strong>, atau mau atur <strong>jadwal fitting</strong>? Pilih topik di bawah atau langsung ketik pesan.
            </p>
          </div>

          <!-- Active Product Context Pill -->
          <div
            v-if="activeProduct"
            class="flex items-center gap-2 rounded-xl border border-[#D7E0D5] bg-[#F3F5F2] px-3 py-2 text-[11px] text-[#455146]"
          >
            <Sparkles class="h-3.5 w-3.5 shrink-0 text-[#556256]" />
            <p class="truncate">
              Sedang melihat: <strong class="text-[#2B2A28]">{{ activeProduct.name }}</strong>
            </p>
          </div>

          <!-- Quick Consultation Topics -->
          <div class="space-y-1.5">
            <p class="text-[10.5px] font-semibold uppercase tracking-wider text-[#8A837A]">
              Pilih Topik Konsultasi Cepat
            </p>
            <button
              v-for="topic in quickTopics"
              :key="topic.id"
              type="button"
              class="flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all"
              :class="
                draftMessage === topic.message
                  ? 'border-[#1E8E4B] bg-[#EEF9F1]'
                  : 'border-[#E8E3DC] bg-white hover:border-[#556256] hover:bg-[#FAF8F5]'
              "
              @click="selectTopic(topic.message)"
            >
              <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F3F5F2] text-[#556256]">
                <component :is="topic.icon" class="h-3.5 w-3.5" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold text-[#2B2A28]">
                  {{ topic.label }}
                </p>
                <p class="text-[11px] text-[#8A837A]">
                  {{ topic.desc }}
                </p>
              </div>
            </button>
          </div>

          <!-- Custom Message Composer -->
          <form class="space-y-2 pt-0.5" @submit.prevent="sendToWhatsApp()">
            <label for="wa-consult-input" class="block text-[10.5px] font-semibold uppercase tracking-wider text-[#8A837A]">
              Pesan ke WhatsApp Admin
            </label>
            <textarea
              id="wa-consult-input"
              v-model="draftMessage"
              rows="3"
              placeholder="Contoh: Halo Admin, LD saya 94 cm cocok pakai ukuran M atau L ya? Boleh minta foto real pic-nya?"
              class="w-full resize-none rounded-xl border border-[#E2DCD3] bg-white px-3 py-2 text-xs leading-relaxed text-[#2B2A28] placeholder:text-[#9A938A] focus:border-[#1E8E4B] focus:outline-none focus:ring-1 focus:ring-[#1E8E4B]"
            />

            <button
              type="submit"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E8E4B] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#17733C]"
            >
              <Send class="h-3.5 w-3.5" />
              Kirim via WhatsApp
            </button>
          </form>

          <!-- Size Guide Shortcut -->
          <div class="border-t border-[#E8E3DC] pt-2.5 text-center">
            <button
              type="button"
              class="inline-flex items-center gap-1 text-[11px] font-medium text-[#556256] underline decoration-[#556256]/40 underline-offset-2 hover:text-[#2B2A28]"
              @click="openSizeChartFromChat"
            >
              <Ruler class="h-3 w-3" />
              Cek Tabel Panduan Ukuran (LD &amp; cm)
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Floating Trigger Button -->
    <button
      type="button"
      class="group relative flex items-center gap-2.5 rounded-full bg-[#1E8E4B] px-3.5 py-3 text-white shadow-lg shadow-[#1E8E4B]/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#17733C] hover:shadow-xl sm:px-4"
      :aria-expanded="isOpen"
      aria-label="Konsultasi WhatsApp Admin Seruni Atelier"
      @click="isOpen = !isOpen"
    >
      <!-- Subtle online pulse dot when closed -->
      <span
        v-if="!isOpen"
        class="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5"
      >
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ADE80] opacity-75" />
        <span class="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#FAF8F5] bg-[#25D366]" />
      </span>

      <X v-if="isOpen" class="h-5 w-5" />
      <MessageCircle v-else class="h-5 w-5 fill-white/15" />

      <span class="hidden text-xs font-semibold tracking-wide sm:inline">
        {{ isOpen ? 'Tutup Chat' : 'Tanya Admin (WA)' }}
      </span>
    </button>
  </div>
</template>
