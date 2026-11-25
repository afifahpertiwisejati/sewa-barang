<script setup lang="ts">
import { ArrowRight, Ruler, ShieldCheck, Sparkles, Truck } from 'lucide-vue-next'
import { RENTAL_CATEGORIES } from '#shared/types/rental'

const { filters } = useCatalogFilters()
const { isAdmin, isLoggedIn } = useAuth()
const router = useRouter()
const toast = useToast()
const newsletterEmail = ref('')

function selectCategory(cat: (typeof RENTAL_CATEGORIES)[number]) {
  filters.value.category = cat
  router.push('/#katalog')
}

function handleSubscribe() {
  if (!newsletterEmail.value.trim()) return
  toast.push('Berlangganan Berhasil', {
    description: 'Katalog kebaya & gaun terbaru akan dikirimkan ke email Anda.',
    type: 'success',
  })
  newsletterEmail.value = ''
}
</script>

<template>
  <div class="mt-20">
    <!-- Minimalist 4-Column Trust Bar -->
    <section class="border-t border-[#E8E3DC] bg-[#FAF8F5]">
      <div class="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div class="flex items-center gap-3">
          <Sparkles class="h-6 w-6 shrink-0 text-[#556256]" stroke-width="1.5" />
          <div>
            <p class="text-xs font-semibold text-[#2B2A28] sm:text-sm">
              Gratis Dry-Clean
            </p>
            <p class="text-[11px] text-[#8A837A]">
              Wangi &amp; steril, tak perlu dicuci
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <ShieldCheck class="h-6 w-6 shrink-0 text-[#556256]" stroke-width="1.5" />
          <div>
            <p class="text-xs font-semibold text-[#2B2A28] sm:text-sm">
              Deposit 100% Aman
            </p>
            <p class="text-[11px] text-[#8A837A]">
              Kembali penuh setelah sewa selesai
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <Truck class="h-6 w-6 shrink-0 text-[#556256]" stroke-width="1.5" />
          <div>
            <p class="text-xs font-semibold text-[#2B2A28] sm:text-sm">
              Kurir Antar Cepat
            </p>
            <p class="text-[11px] text-[#8A837A]">
              Ambil di butik gratis / kurir Rp25rb
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <Ruler class="h-6 w-6 shrink-0 text-[#556256]" stroke-width="1.5" />
          <div>
            <p class="text-xs font-semibold text-[#2B2A28] sm:text-sm">
              Ukuran Lengkap S–XL
            </p>
            <p class="text-[11px] text-[#8A837A]">
              Tersedia panduan lingkar dada
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Deep Sage Editorial Footer -->
    <footer class="bg-[#556256] text-[#EFECE7]">
      <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          <!-- Brand -->
          <div class="lg:col-span-3">
            <NuxtLink to="/" class="font-serif text-2xl font-medium tracking-tight text-white">
              SewaIn+
            </NuxtLink>
            <p class="mt-2.5 text-xs leading-relaxed text-[#D8DFD7]">
              Platform kurasi sewa kebaya wisuda, gaun pesta, dan busana lamaran di Indonesia. Tampil memukau tanpa harus memenuhi lemari.
            </p>
            <div class="mt-5 flex items-center gap-3 text-xs text-[#D8DFD7]">
              <span class="rounded-full border border-white/20 px-2.5 py-1">IG</span>
              <span class="rounded-full border border-white/20 px-2.5 py-1">FB</span>
              <span class="rounded-full border border-white/20 px-2.5 py-1">TT</span>
            </div>
          </div>

          <!-- Quick Links -->
          <div class="lg:col-span-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-white">
              Navigasi
            </h3>
            <ul class="mt-3.5 space-y-2 text-xs text-[#D8DFD7]">
              <li>
                <NuxtLink to="/" class="transition-colors hover:text-white">
                  Beranda
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/#katalog" class="transition-colors hover:text-white">
                  Koleksi Pilihan
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/#terbaru" class="transition-colors hover:text-white">
                  Baru Masuk
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/dashboard" class="transition-colors hover:text-white">
                  Penyewaan Saya
                </NuxtLink>
              </li>
              <li v-if="isAdmin">
                <NuxtLink to="/admin" class="transition-colors hover:text-white">
                  Panel Admin Butik
                </NuxtLink>
              </li>
              <li v-if="!isLoggedIn">
                <NuxtLink to="/login" class="transition-colors hover:text-white">
                  Masuk / Daftar
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Categories -->
          <div class="lg:col-span-3">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-white">
              Kategori Busana
            </h3>
            <ul class="mt-3.5 space-y-2 text-xs text-[#D8DFD7]">
              <li v-for="cat in RENTAL_CATEGORIES" :key="cat">
                <button
                  type="button"
                  class="transition-colors hover:text-white"
                  @click="selectCategory(cat)"
                >
                  {{ cat }}
                </button>
              </li>
            </ul>
          </div>

          <!-- Newsletter -->
          <div class="lg:col-span-4">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-white">
              Tetap Terhubung
            </h3>
            <p class="mt-2.5 text-xs text-[#D8DFD7]">
              Dapatkan info koleksi kebaya wisuda &amp; gaun pesta terbaru setiap minggu.
            </p>
            <form class="mt-4 flex overflow-hidden rounded-md bg-white shadow-sm" @submit.prevent="handleSubscribe">
              <input
                v-model="newsletterEmail"
                type="email"
                required
                placeholder="Masukkan alamat email Anda"
                class="w-full px-3.5 py-2.5 text-xs text-[#2B2A28] placeholder:text-[#8A837A] focus:outline-none"
              >
              <button
                type="submit"
                class="inline-flex items-center justify-center px-3.5 text-[#2B2A28] transition-colors hover:bg-[#EFECE7]"
                aria-label="Daftar newsletter"
              >
                <ArrowRight class="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Bottom Copyright Bar -->
      <div class="border-t border-white/10 bg-[#4A564B]">
        <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-[#D8DFD7] sm:flex-row sm:px-6 lg:px-8">
          <p>&copy; {{ new Date().getFullYear() }} SewaIn+. Seluruh hak cipta dilindungi.</p>
          <div class="flex items-center gap-2">
            <span class="rounded bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white">QRIS</span>
            <span class="rounded bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white">BCA</span>
            <span class="rounded bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white">Mandiri</span>
            <span class="rounded bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white">GoPay</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
