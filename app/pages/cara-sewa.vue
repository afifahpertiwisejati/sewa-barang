<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  IdCard,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from 'lucide-vue-next'

useHead({
  title: 'Cara Sewa & Syarat Ketentuan — Seruni Atelier',
})

const steps = [
  {
    step: '01',
    title: 'Pilih Busana & Ukuran',
    desc: 'Telusuri etalase Kebaya Modern, Gaun Pesta, Jas Pria, High Heels, atau Sepatu Pantofel. Pilih ukuran, warna (jika tersedia), dan cek jadwal kosong di kalender.',
    icon: Sparkles,
  },
  {
    step: '02',
    title: 'Pilih Paket 3 Hari & Jadwal',
    desc: 'Harga katalog berlaku untuk Paket Standar 3 Hari (H-1 ambil, Hari-H acara, H+1 kembali). Butuh lebih lama? Hari tambahan otomatis terhitung transparan di kalkulator.',
    icon: CalendarRange,
  },
  {
    step: '03',
    title: 'Lengkapi Jaminan Identitas',
    desc: 'Pilih kartu identitas resmi (E-KTP, SIM, KTM, atau KK/Paspor) yang akan dititipkan saat serah-terima busana.',
    icon: IdCard,
  },
  {
    step: '04',
    title: 'Selesaikan Pembayaran',
    desc: 'Bayar praktis lewat QRIS / Transfer BCA / Mandiri / GoPay langsung tanpa perlu scan kamera kedua, atau pilih Cash / Tunai saat pengambilan.',
    icon: CreditCard,
  },
  {
    step: '05',
    title: 'Kembalikan & Cairkan Deposit',
    desc: 'Kembalikan busana tanpa perlu dicuci (Gratis Dry-Clean). Setelah dicek Admin, identitas & deposit Anda dikembalikan 100%.',
    icon: RotateCcw,
  },
]

const deductionRules = [
  {
    label: 'Noda',
    detail: 'Noda membandel (tinta, make-up pekat, minyak, atau makanan) yang tidak hilang dengan dry-clean standar.',
    amount: 'Rp10.000',
  },
  {
    label: 'Aksesoris Hilang',
    detail: 'Hilangnya kelengkapan seperti bros, selendang, sabuk, dasi, pocket square, atau garment bag.',
    amount: 'Rp20.000',
  },
  {
    label: 'Telat Pengembalian',
    detail: 'Pengembalian melewati tanggal selesai sewa yang telah disepakati pada nota transaksi.',
    amount: 'Rp25.000',
  },
  {
    label: 'Rusak Ringan',
    detail: 'Jahitan lepas, sobek kecil, kancing copot, payet lepas, atau resleting macet yang masih bisa diperbaiki.',
    amount: 'Rp30.000',
  },
  {
    label: 'Rusak Berat',
    detail: 'Sobek besar, terkena setrika/terbakar, atau kerusakan permanen yang memengaruhi kelayakan pakai busana.',
    amount: 'Rp40.000',
  },
]

const careRules = [
  'Tidak perlu dicuci atau disetrika sendiri — seluruh biaya sewa sudah termasuk layanan Gratis Dry-Clean & Sterilisasi UV profesional.',
  'Dilarang mencuci busana brokat, payet, satin, atau jas wol menggunakan mesin cuci atau pemutih.',
  'Dilarang memotong, menggunting, atau mengubah jahitan permanen pada busana.',
  'Gunakan jarum pentul halus dengan hati-hati (hindari peniti besar yang dapat merobek serat brokat/tile).',
  'Simpan dan kembalikan busana beserta seluruh aksesoris & garment bag sesuai kelengkapan saat diterima.',
]

const faqs = [
  {
    q: 'Bagaimana skema durasi sewa Paket 3 Hari di Seruni Atelier?',
    a: 'Seluruh harga di katalog adalah tarif Paket Standar 3 Hari: H-1 untuk pengambilan/pengantaran busana, Hari-H untuk acara Anda, dan H+1 untuk pengembalian (maksimal pukul 21.00 WIB). Jika butuh lebih lama, tersedia tambahan hemat Paket 4 Hari (+Rp10.000) dan Paket 5 Hari (+Rp15.000).',
  },
  {
    q: 'Apakah busana perlu dicuci sebelum dikembalikan?',
    a: 'Tidak perlu! Semua sewa di Seruni Atelier sudah termasuk layanan laundry dry-clean & sterilisasi profesional agar bahan brokat, payet, dan satin tetap awet.',
  },
  {
    q: 'Kapan deposit keamanan dikembalikan?',
    a: 'Begitu busana dikembalikan dan selesai diperiksa Admin dalam kondisi utuh & lengkap, deposit dikembalikan 100% ke rekening BCA, Mandiri, BRI, GoPay, DANA, OVO, atau tunai langsung di butik.',
  },
  {
    q: 'Apakah pengambilan busana boleh diwakilkan?',
    a: 'Boleh. Saat serah-terima, Admin akan mencatat nama penerima busana pada fitur Konfirmasi Penerima sehingga status penerimaan tetap tercatat rapi di akun Anda.',
  },
  {
    q: 'Bagaimana jika kartu identitas jaminan bukan KTP?',
    a: 'Kami menerima alternatif identitas resmi lain yang masih berlaku seperti SIM A/C, KTM/Kartu Pelajar (khusus wisuda/prom), atau KK/Paspor asli.',
  },
]

const openFaqIdx = ref<number | null>(0)

function toggleFaq(idx: number) {
  openFaqIdx.value = openFaqIdx.value === idx ? null : idx
}
</script>

<template>
  <div class="bg-[#FAF8F5] pb-8">
    <!-- Hero Header -->
    <section class="border-b border-[#E8E3DC] bg-[#EAE5DE]">
      <div class="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 lg:px-8 lg:py-16">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#556256]">
          <FileText class="h-3.5 w-3.5" />
          Panduan &amp; Kebijakan Resmi
        </span>
        <h1 class="mt-4 font-serif text-3xl font-normal tracking-tight text-[#2B2A28] sm:text-4xl lg:text-[42px]">
          Cara Sewa &amp; <span class="italic text-[#556256]">Syarat Ketentuan</span>
        </h1>
        <p class="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-[#5C554E] sm:text-sm">
          Transparan, aman, dan tanpa ribet. Pahami alur pemesanan, jaminan deposit 100% refundable, aturan perawatan, serta daftar potongan denda di Seruni Atelier.
        </p>

        <div class="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-xs">
          <a
            href="#alur-sewa"
            class="rounded-full border border-[#D4CCC2] bg-white px-4 py-2 font-medium text-[#2B2A28] transition-colors hover:border-[#2B2A28]"
          >
            1. Alur Pemesanan
          </a>
          <a
            href="#deposit-jaminan"
            class="rounded-full border border-[#D4CCC2] bg-white px-4 py-2 font-medium text-[#2B2A28] transition-colors hover:border-[#2B2A28]"
          >
            2. Deposit &amp; Jaminan
          </a>
          <a
            href="#denda-potongan"
            class="rounded-full border border-[#D4CCC2] bg-white px-4 py-2 font-medium text-[#2B2A28] transition-colors hover:border-[#2B2A28]"
          >
            3. Aturan Denda &amp; Noda
          </a>
          <a
            href="#syarat-ketentuan"
            class="rounded-full border border-[#D4CCC2] bg-white px-4 py-2 font-medium text-[#2B2A28] transition-colors hover:border-[#2B2A28]"
          >
            4. S&amp;K Perawatan
          </a>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-5xl space-y-12 px-4 pt-12 sm:px-6 lg:px-8">
      <!-- Section 1: 5-Step Rental Flow -->
      <section id="alur-sewa" class="scroll-mt-24">
        <div class="mb-6">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-[#556256]">
            Langkah Mudah
          </p>
          <h2 class="mt-1 font-serif text-2xl text-[#2B2A28] sm:text-3xl">
            Alur Pemesanan di Seruni Atelier
          </h2>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div
            v-for="item in steps"
            :key="item.step"
            class="flex flex-col rounded-2xl border border-[#E8E3DC] bg-white p-4 shadow-[0_1px_2px_rgba(43,42,40,0.03)]"
          >
            <div class="flex items-center justify-between">
              <span class="font-serif text-xl font-medium text-[#556256]">
                {{ item.step }}
              </span>
              <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F5F2] text-[#556256]">
                <component :is="item.icon" class="h-4 w-4" />
              </span>
            </div>
            <h3 class="mt-3 text-sm font-semibold text-[#2B2A28]">
              {{ item.title }}
            </h3>
            <p class="mt-1.5 text-xs leading-relaxed text-[#6B655E]">
              {{ item.desc }}
            </p>
          </div>
        </div>

        <!-- Skema Durasi Paket 3 Hari -->
        <div class="mt-5 rounded-2xl border border-[#D7E0D5] bg-[#F3F5F2] p-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-serif text-lg font-medium text-[#2B2A28]">
                Skema Durasi Sewa: Paket Standar 3 Hari
              </h3>
              <p class="mt-0.5 text-xs text-[#455146]">
                Seluruh tarif yang tercantum di katalog (<strong>/paket 3 hr</strong>) sudah mencakup 3 hari pemakaian penuh:
              </p>
            </div>
            <span class="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#556256] shadow-sm">
              Gratis Dry-Clean &amp; Steam
            </span>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-xl border border-[#DCE4DB] bg-white p-3.5">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-[#556256]">Hari 1 (H-1)</span>
              <p class="mt-1 text-xs font-semibold text-[#2B2A28]">Pengambilan / Pengantaran</p>
              <p class="mt-0.5 text-[11px] text-[#6B655E]">Ambil busana di butik atau terima via kurir dalam kondisi wangi &amp; rapi.</p>
            </div>
            <div class="rounded-xl border border-[#2B2A28] bg-[#2B2A28] p-3.5 text-white">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-[#D8DFD7]">Hari 2 (Hari-H)</span>
              <p class="mt-1 text-xs font-semibold text-white">Hari Acara Wisuda / Pesta</p>
              <p class="mt-0.5 text-[11px] text-[#E5DFD6]">Tampil anggun &amp; nyaman sepanjang acara tanpa khawatir biaya laundry.</p>
            </div>
            <div class="rounded-xl border border-[#DCE4DB] bg-white p-3.5">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-[#556256]">Hari 3 (H+1)</span>
              <p class="mt-1 text-xs font-semibold text-[#2B2A28]">Pengembalian Busana</p>
              <p class="mt-0.5 text-[11px] text-[#6B655E]">Kembalikan maksimal pukul 21.00 WIB (tanpa perlu dicuci) &amp; deposit cair 100%.</p>
            </div>
          </div>

          <p class="mt-3 text-[11px] text-[#455146]">
            <strong>Butuh lebih dari 3 hari?</strong> Tersedia tambahan durasi hemat: <strong>Paket 4 Hari (+Rp10.000)</strong>, <strong>Paket 5 Hari (+Rp15.000)</strong>, dan Rp5.000/hari untuk hari berikutnya — otomatis terhitung di kalkulator sebelum checkout.
          </p>
        </div>
      </section>

      <!-- Section 2: Deposit, Guarantee & Delivery -->
      <section id="deposit-jaminan" class="scroll-mt-24">
        <div class="mb-6">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-[#556256]">
            Keamanan &amp; Transparansi
          </p>
          <h2 class="mt-1 font-serif text-2xl text-[#2B2A28] sm:text-3xl">
            Ketentuan Deposit, Jaminan &amp; Pengiriman
          </h2>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="rounded-2xl border border-[#E8E3DC] bg-white p-5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F5F2] text-[#556256]">
              <ShieldCheck class="h-5 w-5" />
            </div>
            <h3 class="mt-3.5 font-serif text-lg text-[#2B2A28]">
              Deposit Keamanan (Refundable)
            </h3>
            <p class="mt-2 text-xs leading-relaxed text-[#6B655E]">
              Besaran deposit berkisar <strong>Rp50.000 – Rp100.000</strong> tergantung jenis busana dan selalu ditampilkan transparan sebelum checkout. Deposit <strong>dikembalikan 100%</strong> saat busana kembali utuh dan tepat waktu.
            </p>
            <p class="mt-2.5 rounded-lg bg-[#FAF8F5] px-3 py-2 text-[11px] text-[#556256]">
              Pencairan via Transfer BCA, Mandiri, BRI, GoPay, DANA, OVO, atau Tunai di Butik.
            </p>
          </div>

          <div class="rounded-2xl border border-[#E8E3DC] bg-white p-5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F5F2] text-[#556256]">
              <IdCard class="h-5 w-5" />
            </div>
            <h3 class="mt-3.5 font-serif text-lg text-[#2B2A28]">
              Jaminan Identitas Resmi
            </h3>
            <p class="mt-2 text-xs leading-relaxed text-[#6B655E]">
              Penyewa menitipkan 1 kartu identitas asli saat serah-terima busana: <strong>E-KTP, SIM A/C, KTM/Kartu Pelajar, atau KK/Paspor</strong>. Identitas dijaga kerahasiaannya dan dikembalikan penuh saat pengembalian.
            </p>
            <p class="mt-2.5 rounded-lg bg-[#FAF8F5] px-3 py-2 text-[11px] text-[#556256]">
              Status titip &amp; kembali tercatat real-time di halaman Penyewaan Saya.
            </p>
          </div>

          <div class="rounded-2xl border border-[#E8E3DC] bg-white p-5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F5F2] text-[#556256]">
              <Truck class="h-5 w-5" />
            </div>
            <h3 class="mt-3.5 font-serif text-lg text-[#2B2A28]">
              Ambil Sendiri &amp; Kurir Antar
            </h3>
            <ul class="mt-2 space-y-2 text-xs text-[#6B655E]">
              <li class="flex items-start gap-2">
                <Store class="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#556256]" />
                <span><strong>Ambil Sendiri di Butik:</strong> Gratis (Rp0), bisa cek langsung kelengkapan &amp; kondisi busana.</span>
              </li>
              <li class="flex items-start gap-2">
                <Truck class="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#556256]" />
                <span><strong>Kurir Antar:</strong> Tarif flat <strong>Rp15.000</strong> langsung ke alamat penyewa dengan pencatatan penerima.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Section 3: Transparent Deduction Table -->
      <section id="denda-potongan" class="scroll-mt-24">
        <div class="overflow-hidden rounded-2xl border border-[#E8E3DC] bg-white">
          <div class="flex flex-col gap-2 border-b border-[#EFECE7] bg-[#FAF8F5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div class="flex items-center gap-2 text-xs font-semibold text-[#9E5245]">
                <AlertTriangle class="h-4 w-4" />
                <span>Ketentuan Potongan Deposit</span>
              </div>
              <h2 class="mt-1 font-serif text-xl text-[#2B2A28] sm:text-2xl">
                Rincian Denda Keterlambatan, Noda &amp; Kerusakan
              </h2>
            </div>
            <span class="inline-flex w-fit items-center rounded-full bg-[#E3E8E2] px-3 py-1 text-[11px] font-medium text-[#384239]">
              Kondisi Utuh = Rp0 Potongan
            </span>
          </div>

          <div class="divide-y divide-[#EFECE7]">
            <div
              v-for="rule in deductionRules"
              :key="rule.label"
              class="flex flex-col justify-between gap-2 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
            >
              <div class="min-w-0">
                <p class="text-sm font-semibold text-[#2B2A28]">
                  {{ rule.label }}
                </p>
                <p class="mt-0.5 text-xs leading-relaxed text-[#6B655E]">
                  {{ rule.detail }}
                </p>
              </div>
              <span class="inline-flex w-fit shrink-0 items-center rounded-lg bg-[#FAF4F1] px-3 py-1.5 font-serif text-sm font-semibold text-[#9E5245] ring-1 ring-[#E8D0CB]">
                {{ rule.amount }}
              </span>
            </div>
          </div>

          <div class="border-t border-[#EFECE7] bg-[#FAF8F5] px-5 py-3.5 text-[11px] leading-relaxed text-[#6B655E] sm:px-6">
            <strong>Catatan:</strong> Potongan langsung dikurangi dari deposit keamanan dan sisa deposit otomatis dikembalikan beserta <strong>Bukti Pengembalian Deposit</strong> &amp; catatan pemeriksaan resmi dari Admin. Untuk kehilangan busana total atau kerusakan parah melebihi deposit, penyelesaian mengikuti kesepakatan bersama.
          </div>
        </div>
      </section>

      <!-- Section 4: Care Rules & S&K -->
      <section id="syarat-ketentuan" class="scroll-mt-24">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div class="rounded-2xl border border-[#E8E3DC] bg-white p-5 sm:p-6 lg:col-span-7">
            <h2 class="font-serif text-xl text-[#2B2A28] sm:text-2xl">
              Syarat &amp; Ketentuan Perawatan Busana
            </h2>
            <p class="mt-1 text-xs text-[#8A837A]">
              Harap diperhatikan agar deposit Anda kembali 100% tanpa potongan:
            </p>
            <ul class="mt-4 space-y-3">
              <li
                v-for="(rule, i) in careRules"
                :key="i"
                class="flex items-start gap-2.5 text-xs leading-relaxed text-[#4A4641]"
              >
                <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-[#556256]" />
                <span>{{ rule }}</span>
              </li>
            </ul>
          </div>

          <!-- FAQ Accordion -->
          <div class="rounded-2xl border border-[#E8E3DC] bg-white p-5 sm:p-6 lg:col-span-5">
            <h2 class="font-serif text-xl text-[#2B2A28] sm:text-2xl">
              Pertanyaan Umum
            </h2>
            <div class="mt-4 divide-y divide-[#EFECE7]">
              <div v-for="(faq, idx) in faqs" :key="faq.q" class="py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-[#2B2A28]"
                  @click="toggleFaq(idx)"
                >
                  <span>{{ faq.q }}</span>
                  <ChevronDown
                    class="h-4 w-4 shrink-0 text-[#8A837A] transition-transform"
                    :class="openFaqIdx === idx ? 'rotate-180 text-[#556256]' : ''"
                  />
                </button>
                <p
                  v-if="openFaqIdx === idx"
                  class="mt-2 text-xs leading-relaxed text-[#6B655E]"
                >
                  {{ faq.a }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Bottom CTA -->
      <section class="flex flex-col items-center justify-between gap-4 rounded-2xl bg-[#556256] px-6 py-7 text-center text-white sm:flex-row sm:text-left">
        <div>
          <h3 class="font-serif text-xl sm:text-2xl">
            Siap Memilih Busana untuk Acara Anda?
          </h3>
          <p class="mt-1 text-xs text-[#D8DFD7]">
            Semua koleksi sudah wangi, steril, dan siap dipakai tanpa perlu mencuci saat kembali.
          </p>
        </div>
        <NuxtLink
          to="/#katalog"
          class="inline-flex shrink-0 items-center gap-2 rounded-md bg-white px-5 py-2.5 text-xs font-semibold text-[#2B2A28] transition-colors hover:bg-[#FAF8F5]"
        >
          Jelajahi Etalase
          <ArrowRight class="h-3.5 w-3.5" />
        </NuxtLink>
      </section>
    </div>
  </div>
</template>
