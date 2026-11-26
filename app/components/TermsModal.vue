<script setup lang="ts">
import { AlertTriangle, CheckCircle2, FileText, ShieldCheck, X } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const deductionItems = [
  { label: 'Noda membandel', amount: 'Rp10.000' },
  { label: 'Aksesoris hilang (bros/selendang/dasi/bag)', amount: 'Rp20.000' },
  { label: 'Telat pengembalian', amount: 'Rp25.000' },
  { label: 'Rusak ringan (jahitan/payet/kancing)', amount: 'Rp30.000' },
  { label: 'Rusak berat (sobek besar/terbakar)', amount: 'Rp40.000' },
]
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
        v-if="props.open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2A28]/60 p-4 backdrop-blur-xs"
        @click.self="emit('close')"
      >
        <div class="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E8E3DC] bg-white shadow-xl">
          <!-- Header -->
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-[#EFECE7] bg-white px-5 py-4">
            <div class="flex items-center gap-2.5">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F5F2] text-[#556256]">
                <FileText class="h-4 w-4" />
              </div>
              <div>
                <h2 class="font-serif text-lg font-medium text-[#2B2A28]">
                  Cara Sewa &amp; Syarat Ketentuan
                </h2>
                <p class="text-[11px] text-[#8A837A]">
                  Ringkasan kebijakan sewa Seruni Atelier
                </p>
              </div>
            </div>
            <button
              type="button"
              class="rounded-full p-1.5 text-[#8A837A] hover:bg-[#FAF8F5] hover:text-[#2B2A28]"
              aria-label="Tutup modal S&K"
              @click="emit('close')"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Content -->
          <div class="space-y-4 p-5 text-xs text-[#4A4641]">
            <div class="rounded-xl border border-[#D7E0D5] bg-[#F3F5F2] p-3.5">
              <div class="flex items-center gap-1.5 font-semibold text-[#2B2A28]">
                <ShieldCheck class="h-4 w-4 text-[#556256]" />
                <span>Deposit 100% Refundable &amp; Gratis Dry-Clean</span>
              </div>
              <ul class="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-[#455146]">
                <li class="flex items-start gap-1.5">
                  <CheckCircle2 class="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#556256]" />
                  <span><strong>Skema Paket 3 Hari:</strong> Harga katalog mencakup 3 hari sewa (H-1 ambil, Hari-H acara, H+1 kembali). Tambahan durasi: <strong>4 Hari (+Rp10.000)</strong> &amp; <strong>5 Hari (+Rp15.000)</strong>.</span>
                </li>
                <li class="flex items-start gap-1.5">
                  <CheckCircle2 class="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#556256]" />
                  <span>Deposit keamanan dikembalikan 100% via Transfer Bank, E-Wallet, atau Tunai saat busana kembali utuh &amp; tepat waktu.</span>
                </li>
                <li class="flex items-start gap-1.5">
                  <CheckCircle2 class="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#556256]" />
                  <span>Kartu identitas asli (KTP/SIM/KTM/KK/Paspor) dititipkan saat serah-terima dan dikembalikan penuh saat busana kembali.</span>
                </li>
                <li class="flex items-start gap-1.5">
                  <CheckCircle2 class="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#556256]" />
                  <span><strong>Jangan dicuci atau disetrika sendiri</strong> — dry-clean profesional sudah termasuk dalam harga sewa.</span>
                </li>
              </ul>
            </div>

            <div class="rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] p-3.5">
              <div class="flex items-center gap-1.5 font-semibold text-[#9E5245]">
                <AlertTriangle class="h-4 w-4" />
                <span>Ketentuan Potongan Deposit (Jika Ada Kendala)</span>
              </div>
              <div class="mt-2.5 divide-y divide-[#ECE7DF]">
                <div
                  v-for="item in deductionItems"
                  :key="item.label"
                  class="flex items-center justify-between gap-2 py-1.5 text-[11.5px]"
                >
                  <span class="text-[#5C554E]">{{ item.label }}</span>
                  <span class="font-semibold text-[#9E5245]">{{ item.amount }}</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-2 pt-1 sm:flex-row">
              <button
                type="button"
                class="flex-1 rounded-md bg-[#2B2A28] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#3F3D39]"
                @click="emit('close')"
              >
                Saya Mengerti
              </button>
              <NuxtLink
                to="/cara-sewa"
                class="inline-flex items-center justify-center rounded-md border border-[#E8E3DC] bg-white px-4 py-2.5 text-xs font-medium text-[#556256] hover:border-[#556256]"
                @click="emit('close')"
              >
                Baca Halaman Lengkap &rarr;
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
