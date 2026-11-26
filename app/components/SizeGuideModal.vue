<script setup lang="ts">
import { Info, Ruler, X } from 'lucide-vue-next'
import type { SizeGuideTab } from '../composables/useSizeGuide'

const { isOpen, activeTab, closeSizeGuide } = useSizeGuide()

const tabs: { key: SizeGuideTab, label: string }[] = [
  { key: 'wanita', label: 'Kebaya & Gaun' },
  { key: 'jas', label: 'Jas Pria' },
  { key: 'heels', label: 'High Heels' },
  { key: 'pantofel', label: 'Sepatu Pantofel' },
]

const wanitaSizes = [
  { size: 'S', ld: '84 – 88 cm', lp: '66 – 70 cm', hip: '90 – 94 cm', length: '136 cm', weight: '42 – 48 kg' },
  { size: 'M', ld: '90 – 94 cm', lp: '72 – 76 cm', hip: '96 – 100 cm', length: '138 cm', weight: '49 – 55 kg' },
  { size: 'L', ld: '96 – 100 cm', lp: '78 – 82 cm', hip: '102 – 106 cm', length: '140 cm', weight: '56 – 63 kg' },
  { size: 'XL', ld: '102 – 108 cm', lp: '84 – 90 cm', hip: '108 – 114 cm', length: '142 cm', weight: '64 – 72 kg' },
  { size: 'XXL', ld: '110 – 116 cm', lp: '92 – 98 cm', hip: '116 – 122 cm', length: '142 cm', weight: '73 – 82 kg' },
  { size: 'All Size', ld: '88 – 104 cm', lp: '70 – 88 cm', hip: '94 – 110 cm', length: '138 – 140 cm', weight: 'Fit S – XL' },
]

const jasSizes = [
  { size: 'S', chest: '96 – 100 cm', shoulder: '43 cm', sleeve: '60 cm', length: '70 cm', waist: '76 – 80 cm (29–30)' },
  { size: 'M', chest: '102 – 106 cm', shoulder: '45 cm', sleeve: '61 cm', length: '72 cm', waist: '81 – 85 cm (31–32)' },
  { size: 'L', chest: '108 – 112 cm', shoulder: '47 cm', sleeve: '63 cm', length: '74 cm', waist: '86 – 90 cm (33–34)' },
  { size: 'XL', chest: '114 – 118 cm', shoulder: '49 cm', sleeve: '64 cm', length: '76 cm', waist: '91 – 96 cm (35–36)' },
  { size: 'XXL', chest: '120 – 124 cm', shoulder: '51 cm', sleeve: '65 cm', length: '78 cm', waist: '97 – 102 cm (37–38)' },
]

const heelsSizes = [
  { size: '36', insole: '23.0 cm', note: 'Kaki ramping / standar' },
  { size: '37', insole: '23.5 cm', note: 'Kaki ramping / standar' },
  { size: '38', insole: '24.0 cm', note: 'Ukuran paling umum' },
  { size: '39', insole: '24.5 cm', note: 'Disarankan naik 1 size jika ujung lancip' },
  { size: '40', insole: '25.0 cm', note: 'Nyaman untuk kaki agak lebar' },
]

const pantofelSizes = [
  { size: '40', insole: '25.5 cm', note: 'EU 40 / US 7.5' },
  { size: '41', insole: '26.0 cm', note: 'EU 41 / US 8' },
  { size: '42', insole: '26.8 cm', note: 'EU 42 / US 9' },
  { size: '43', insole: '27.5 cm', note: 'EU 43 / US 10' },
  { size: '44', insole: '28.0 cm', note: 'EU 44 / US 10.5' },
]

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    closeSizeGuide()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2A28]/60 p-4 backdrop-blur-xs"
        @click.self="closeSizeGuide"
      >
        <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E8E3DC] bg-white shadow-2xl">
          <!-- Header -->
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-[#EFECE7] bg-white px-5 py-4">
            <div class="flex items-center gap-2.5">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F5F2] text-[#556256]">
                <Ruler class="h-4 w-4" />
              </div>
              <div>
                <h2 class="font-serif text-lg font-medium text-[#2B2A28]">
                  Panduan Ukuran (Size Chart)
                </h2>
                <p class="text-[11px] text-[#8A837A]">
                  Standar ukuran resmi butik Seruni Atelier dalam sentimeter (cm)
                </p>
              </div>
            </div>

            <button
              type="button"
              class="rounded-full p-1.5 text-[#8A837A] hover:bg-[#FAF8F5] hover:text-[#2B2A28]"
              aria-label="Tutup panduan ukuran"
              @click="closeSizeGuide"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="space-y-5 p-5">
            <!-- Category Tabs -->
            <div class="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                type="button"
                class="shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
                :class="
                  activeTab === tab.key
                    ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
                    : 'border-[#E8E3DC] bg-[#FAF8F5] text-[#6B655E] hover:border-[#556256] hover:text-[#2B2A28]'
                "
                @click="activeTab = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>

            <!-- TAB 1: Kebaya & Gaun (Wanita) -->
            <div v-if="activeTab === 'wanita'" class="overflow-hidden rounded-xl border border-[#E8E3DC]">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-[#EFECE7] text-left text-xs">
                  <thead class="bg-[#FAF8F5] text-[10.5px] font-semibold uppercase tracking-wider text-[#6B655E]">
                    <tr>
                      <th class="px-3.5 py-2.5">Ukuran</th>
                      <th class="px-3.5 py-2.5">Lingkar Dada (LD)</th>
                      <th class="px-3.5 py-2.5">Lingkar Pinggang</th>
                      <th class="px-3.5 py-2.5">Lingkar Pinggul</th>
                      <th class="px-3.5 py-2.5">Panjang</th>
                      <th class="px-3.5 py-2.5">Estimasi BB</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#EFECE7] bg-white">
                    <tr v-for="row in wanitaSizes" :key="row.size" class="hover:bg-[#FAF8F5]/70">
                      <td class="whitespace-nowrap px-3.5 py-2.5 font-semibold text-[#2B2A28]">
                        {{ row.size }}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 font-medium text-[#556256]">
                        {{ row.ld }}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-[#6B655E]">
                        {{ row.lp }}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-[#6B655E]">
                        {{ row.hip }}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-[#6B655E]">
                        {{ row.length }}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-[#8A837A]">
                        {{ row.weight }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- TAB 2: Jas Pria -->
            <div v-else-if="activeTab === 'jas'" class="overflow-hidden rounded-xl border border-[#E8E3DC]">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-[#EFECE7] text-left text-xs">
                  <thead class="bg-[#FAF8F5] text-[10.5px] font-semibold uppercase tracking-wider text-[#6B655E]">
                    <tr>
                      <th class="px-3.5 py-2.5">Ukuran</th>
                      <th class="px-3.5 py-2.5">Lingkar Dada</th>
                      <th class="px-3.5 py-2.5">Lebar Bahu</th>
                      <th class="px-3.5 py-2.5">Lengan</th>
                      <th class="px-3.5 py-2.5">Panjang Jas</th>
                      <th class="px-3.5 py-2.5">Pinggang Celana</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#EFECE7] bg-white">
                    <tr v-for="row in jasSizes" :key="row.size" class="hover:bg-[#FAF8F5]/70">
                      <td class="whitespace-nowrap px-3.5 py-2.5 font-semibold text-[#2B2A28]">
                        {{ row.size }}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 font-medium text-[#556256]">
                        {{ row.chest }}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-[#6B655E]">
                        {{ row.shoulder }}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-[#6B655E]">
                        {{ row.sleeve }}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-[#6B655E]">
                        {{ row.length }}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-[#8A837A]">
                        {{ row.waist }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- TAB 3: High Heels -->
            <div v-else-if="activeTab === 'heels'" class="overflow-hidden rounded-xl border border-[#E8E3DC]">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-[#EFECE7] text-left text-xs">
                  <thead class="bg-[#FAF8F5] text-[10.5px] font-semibold uppercase tracking-wider text-[#6B655E]">
                    <tr>
                      <th class="px-4 py-2.5">Ukuran EU</th>
                      <th class="px-4 py-2.5">Panjang Insole (Kaki)</th>
                      <th class="px-4 py-2.5">Catatan</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#EFECE7] bg-white">
                    <tr v-for="row in heelsSizes" :key="row.size" class="hover:bg-[#FAF8F5]/70">
                      <td class="whitespace-nowrap px-4 py-2.5 font-semibold text-[#2B2A28]">
                        Size {{ row.size }}
                      </td>
                      <td class="whitespace-nowrap px-4 py-2.5 font-medium text-[#556256]">
                        {{ row.insole }}
                      </td>
                      <td class="px-4 py-2.5 text-[#6B655E]">
                        {{ row.note }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- TAB 4: Sepatu Pantofel -->
            <div v-else class="overflow-hidden rounded-xl border border-[#E8E3DC]">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-[#EFECE7] text-left text-xs">
                  <thead class="bg-[#FAF8F5] text-[10.5px] font-semibold uppercase tracking-wider text-[#6B655E]">
                    <tr>
                      <th class="px-4 py-2.5">Ukuran EU</th>
                      <th class="px-4 py-2.5">Panjang Insole (Kaki)</th>
                      <th class="px-4 py-2.5">Konversi</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#EFECE7] bg-white">
                    <tr v-for="row in pantofelSizes" :key="row.size" class="hover:bg-[#FAF8F5]/70">
                      <td class="whitespace-nowrap px-4 py-2.5 font-semibold text-[#2B2A28]">
                        Size {{ row.size }}
                      </td>
                      <td class="whitespace-nowrap px-4 py-2.5 font-medium text-[#556256]">
                        {{ row.insole }}
                      </td>
                      <td class="px-4 py-2.5 text-[#6B655E]">
                        {{ row.note }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- How to Measure Tip Box -->
            <div class="flex items-start gap-2.5 rounded-xl border border-[#D7E0D5] bg-[#F3F5F2] p-3.5 text-[11.5px] leading-relaxed text-[#455146]">
              <Info class="mt-0.5 h-4 w-4 shrink-0 text-[#556256]" />
              <div>
                <p class="font-semibold text-[#2B2A28]">
                  Tips Memilih Ukuran yang Nyaman
                </p>
                <p class="mt-0.5">
                  <template v-if="activeTab === 'wanita'">
                    Ukur <strong>Lingkar Dada (LD)</strong> pada bagian dada paling penuh secara mendatar. Untuk kebaya brokat atau gaun berfuring yang tidak melar, pilih 1 tingkat lebih besar jika ukuran Anda berada di batas atas (mis. LD 94 cm disarankan pilih M/L agar lega saat duduk &amp; berfoto).
                  </template>
                  <template v-else-if="activeTab === 'jas'">
                    Ukur lingkar dada di atas kemeja. Jika bahu agak bidang atau ingin memakai rompi (vest) di dalam jas, disarankan naik 1 ukuran agar potongan tetap rapi.
                  </template>
                  <template v-else>
                    Letakkan kaki di atas kertas, tandai ujung jari terpanjang hingga tumit, lalu ukur panjangnya (cm). Tambahkan +0,5 cm jika kaki cenderung lebar atau memilih model ujung lancip (pointed-toe).
                  </template>
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex justify-end">
              <button
                type="button"
                class="rounded-md bg-[#2B2A28] px-5 py-2 text-xs font-medium text-white hover:bg-[#3F3D39]"
                @click="closeSizeGuide"
              >
                Tutup Panduan Ukuran
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
