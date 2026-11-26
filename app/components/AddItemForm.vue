<script setup lang="ts">
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from 'lucide-vue-next'
import {
  AVAILABLE_SIZES,
  RENTAL_CATEGORIES,
  SHOE_SIZES_MEN,
  SHOE_SIZES_WOMEN,
  type RentalCategory,
  type RentalItem,
} from '#shared/types/rental'

const emit = defineEmits<{
  created: [item: RentalItem]
}>()

const { formatRupiah } = useFormatters()
const toast = useToast()

const sampleImages = [
  {
    label: 'Kebaya Burgundy',
    url: '/images/kebaya-burgundy-couture.jpg',
  },
  {
    label: 'Kebaya Janggan',
    url: '/images/kebaya-janggan-denim.jpg',
  },
  {
    label: 'Kebaya Butter',
    url: '/images/kebaya-butter-yellow.jpg',
  },
  {
    label: 'Dress Modern',
    url: '/images/dress-dusty-pink-drape.jpg',
  },
  {
    label: 'Jas Pria',
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'High Heels',
    url: '/images/heels-ivory-pearl.jpg',
  },
  {
    label: 'Sepatu Pantofel',
    url: '/images/pantofel-oxford-hitam.jpg',
  },
]

const form = reactive({
  name: '',
  category: 'Kebaya Modern' as RentalCategory,
  location: 'Jakarta Selatan',
  pricePerDay: 85000,
  deposit: 75000,
  sizes: ['S', 'M', 'L'] as string[],
  description: '',
  imageUrl: sampleImages[0]!.url,
  gallery: [] as string[],
  ownerName: 'Ayu Prameswari',
  fabricSpec: 'Bahan Premium + Gratis Dry-Clean / Sanitasi',
})

const isUploadingImage = ref(false)
const hasCustomUpload = ref(false)
const uploadError = ref('')
const isDraggingPhoto = ref(false)
const productPhotoInput = ref<HTMLInputElement | null>(null)

const sizeChoices = computed<readonly string[]>(() => {
  if (form.category === 'High Heels') return SHOE_SIZES_WOMEN
  if (form.category === 'Sepatu Pantofel') return SHOE_SIZES_MEN
  return AVAILABLE_SIZES
})

watch(() => form.category, (cat) => {
  if (cat === 'High Heels') {
    form.sizes = ['37', '38', '39']
    if (!hasCustomUpload.value) form.imageUrl = sampleImages[5]!.url
    form.pricePerDay = 40000
    form.deposit = 50000
  }
  else if (cat === 'Sepatu Pantofel') {
    form.sizes = ['41', '42', '43']
    if (!hasCustomUpload.value) form.imageUrl = sampleImages[6]!.url
    form.pricePerDay = 45000
    form.deposit = 50000
  }
  else if (cat === 'Jas Pria') {
    form.sizes = ['M', 'L', 'XL']
    if (!hasCustomUpload.value) form.imageUrl = sampleImages[4]!.url
    form.pricePerDay = 95000
    form.deposit = 100000
  }
  else {
    form.sizes = ['S', 'M', 'L']
    form.pricePerDay = 85000
    form.deposit = 75000
  }
})

const isSubmitting = ref(false)
const formError = ref('')
const createdItem = ref<RentalItem | null>(null)
const previewImgBroken = ref(false)

watch(() => form.imageUrl, () => {
  previewImgBroken.value = false
})

function toggleSize(size: string) {
  if (form.sizes.includes(size)) {
    if (form.sizes.length > 1) {
      form.sizes = form.sizes.filter(s => s !== size)
    }
  }
  else {
    form.sizes.push(size)
  }
}

function triggerProductPhotoPicker() {
  if (isUploadingImage.value) return
  productPhotoInput.value?.click()
}

async function uploadSelectedFiles(files: File[]) {
  if (files.length === 0) return

  formError.value = ''
  uploadError.value = ''
  isUploadingImage.value = true

  try {
    const uploadedUrls: string[] = []
    for (const file of files) {
      const optimizedFile = await compressImageFile(file)
      const formData = new FormData()
      formData.append('file', optimizedFile, optimizedFile.name || 'photo.jpg')
      const res = await $fetch<{ url: string }>('/api/uploads/product-image', {
        method: 'POST',
        body: formData,
      })
      if (res?.url) {
        uploadedUrls.push(res.url)
      }
    }

    if (uploadedUrls.length > 0) {
      form.imageUrl = uploadedUrls[0]!
      hasCustomUpload.value = true
      form.gallery = Array.from(new Set([...uploadedUrls, ...form.gallery]))
      toast.push('Foto Produk Berhasil Diunggah!', {
        description: `${uploadedUrls.length} foto siap ditampilkan di katalog.`,
        type: 'success',
      })
    }
  }
  catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string, message?: string }, statusMessage?: string, message?: string }
    const msg
      = fetchErr?.data?.statusMessage
        || fetchErr?.data?.message
        || fetchErr?.statusMessage
        || fetchErr?.message
        || 'Gagal mengunggah foto produk (maks. 10 MB, JPG/PNG/WEBP).'
    uploadError.value = msg
    formError.value = msg
    toast.push('Gagal Upload Foto', { description: msg, type: 'error' })
  }
  finally {
    isUploadingImage.value = false
    if (productPhotoInput.value) {
      productPhotoInput.value.value = ''
    }
  }
}

async function handleProductPhotoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  await uploadSelectedFiles(files)
}

async function handlePhotoDrop(event: DragEvent) {
  isDraggingPhoto.value = false
  const files = Array.from(event.dataTransfer?.files ?? [])
  await uploadSelectedFiles(files)
}

function setAsMainPhoto(url: string) {
  form.imageUrl = url
  hasCustomUpload.value = true
}

function removeGalleryPhoto(url: string) {
  form.gallery = form.gallery.filter(u => u !== url)
  if (form.imageUrl === url) {
    form.imageUrl = form.gallery[0] || ''
    if (!form.imageUrl) {
      hasCustomUpload.value = false
    }
  }
}

async function handleSubmit() {
  formError.value = ''

  if (form.name.trim().length < 4) {
    formError.value = 'Nama busana minimal 4 karakter.'
    return
  }
  if (form.location.trim().length < 2) {
    formError.value = 'Lokasi kota wajib diisi.'
    return
  }
  if (!form.pricePerDay || form.pricePerDay < 5000) {
    formError.value = 'Harga paket sewa 3 hari minimal Rp5.000.'
    return
  }
  if (form.deposit < 0) {
    formError.value = 'Nilai deposit tidak boleh negatif.'
    return
  }
  if (form.description.trim().length < 15) {
    formError.value = 'Deskripsi lengkap minimal 15 karakter agar penyewa yakin.'
    return
  }
  if (!/^(https?:\/\/|\/images\/|\/uploads\/|\/api\/uploads\/).+/i.test(form.imageUrl.trim())) {
    formError.value = 'Silakan upload foto produk dari perangkat Anda atau masukkan URL gambar yang valid.'
    return
  }

  isSubmitting.value = true

  try {
    const newItem = await $fetch<RentalItem>('/api/items', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        category: form.category,
        location: form.location.trim(),
        pricePerDay: Number(form.pricePerDay),
        deposit: Number(form.deposit),
        sizes: [...form.sizes],
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        gallery: form.gallery.length > 0 ? form.gallery : [form.imageUrl.trim()],
        ownerName: form.ownerName.trim() || 'Ayu Prameswari',
        specs: [
          { label: 'Bahan & Detail', value: form.fabricSpec.trim() || 'Premium Boutique Quality' },
          { label: 'Ukuran Tersedia', value: form.sizes.join(', ') },
          { label: 'Lokasi', value: form.location.trim() },
          { label: 'Perawatan', value: 'Gratis Dry-Clean Profesional' },
        ],
      },
    })

    createdItem.value = newItem
    emit('created', newItem)

    toast.push('Busana Berhasil Ditayangkan!', {
      description: `"${newItem.name}" kini sudah tampil di katalog utama Seruni Atelier.`,
      type: 'success',
    })

    form.name = ''
    form.description = ''
    form.gallery = []
    hasCustomUpload.value = false
  }
  catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string }, statusMessage?: string }
    formError.value
      = fetchErr?.data?.statusMessage
        || fetchErr?.statusMessage
        || 'Gagal menambahkan busana baru.'
    toast.push('Gagal Menyimpan Busana', {
      description: formError.value,
      type: 'error',
    })
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
    <!-- Left: Form -->
    <div class="lg:col-span-7 xl:col-span-8">
      <!-- Success Banner -->
      <div
        v-if="createdItem"
        class="mb-5 flex flex-col gap-3 rounded-2xl border border-[#C7D1C5] bg-[#F3F5F2] p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-start gap-3">
          <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-[#556256]" />
          <div>
            <p class="font-serif text-base font-medium text-[#2B2A28]">
              Busana "{{ createdItem.name }}" Sudah Tayang!
            </p>
            <p class="text-xs text-[#556256]">
              Langsung masuk ke katalog utama dan siap disewa untuk wisuda atau pesta.
            </p>
          </div>
        </div>
        <div class="flex shrink-0 gap-2">
          <NuxtLink
            :to="`/items/${createdItem.id}`"
            class="rounded-md bg-[#2B2A28] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#3F3D39]"
          >
            Lihat Busana
          </NuxtLink>
          <NuxtLink
            to="/"
            class="rounded-md border border-[#C7D1C5] bg-white px-3.5 py-2 text-xs font-medium text-[#2B2A28] hover:bg-[#FAF8F5]"
          >
            Ke Katalog
          </NuxtLink>
        </div>
      </div>

      <form
        class="rounded-2xl border border-[#E8E3DC] bg-white p-5 sm:p-6"
        @submit.prevent="handleSubmit"
      >
        <div class="border-b border-[#EFECE7] pb-4">
          <h2 class="font-serif text-xl font-medium text-[#2B2A28]">
            Sewakan Dress atau Kebaya Anda
          </h2>
          <p class="mt-1 text-xs text-[#8A837A]">
            Daftarkan koleksi kebaya modern, gaun pesta, atau dress bridesmaid agar dapat disewa pengguna lain.
          </p>
        </div>

        <div class="mt-5 space-y-4">
          <!-- Name -->
          <div>
            <label for="item-name" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
              Nama Dress / Kebaya <span class="text-rose-500">*</span>
            </label>
            <input
              id="item-name"
              v-model="form.name"
              type="text"
              required
              placeholder="Contoh: Kebaya Brokat Dusty Pink 'Amara' + Kain Songket"
              class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] placeholder:text-[#A39C93] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
            >
          </div>

          <!-- Category & Location -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="item-category" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
                Kategori <span class="text-rose-500">*</span>
              </label>
              <select
                id="item-category"
                v-model="form.category"
                class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
              >
                <option v-for="cat in RENTAL_CATEGORIES" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>

            <div>
              <label for="item-location" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
                Lokasi Kota <span class="text-rose-500">*</span>
              </label>
              <input
                id="item-location"
                v-model="form.location"
                type="text"
                required
                placeholder="Contoh: Bandung, Jakarta Selatan, Yogyakarta"
                class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] placeholder:text-[#A39C93] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
              >
            </div>
          </div>

          <!-- Sizes -->
          <div>
            <span class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
              Pilihan Ukuran Tersedia <span class="text-rose-500">*</span>
            </span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="size in sizeChoices"
                :key="size"
                type="button"
                class="rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-all"
                :class="
                  form.sizes.includes(size)
                    ? 'border-[#2B2A28] bg-[#2B2A28] text-white'
                    : 'border-[#E8E3DC] bg-[#FAF8F5] text-[#6B655E] hover:border-[#556256]'
                "
                @click="toggleSize(size)"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <!-- Price & Deposit -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="item-price" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
                Harga Paket 3 Hari (Rp) <span class="text-rose-500">*</span>
              </label>
              <input
                id="item-price"
                v-model.number="form.pricePerDay"
                type="number"
                min="5000"
                step="5000"
                required
                class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm font-medium text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
              >
            </div>

            <div>
              <label for="item-deposit" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
                Nilai Deposit Keamanan (Rp) <span class="text-rose-500">*</span>
              </label>
              <input
                id="item-deposit"
                v-model.number="form.deposit"
                type="number"
                min="0"
                step="10000"
                required
                class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm font-medium text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
              >
            </div>
          </div>

          <!-- Owner & Fabric -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="item-owner" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
                Nama Pemilik / Butik
              </label>
              <input
                id="item-owner"
                v-model="form.ownerName"
                type="text"
                placeholder="Nama lengkap atau nama butik"
                class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
              >
            </div>

            <div>
              <label for="item-fabric" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
                Bahan &amp; Kelengkapan
              </label>
              <input
                id="item-fabric"
                v-model="form.fabricSpec"
                type="text"
                placeholder="Brokat payet + bustier + kain lilit"
                class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
              >
            </div>
          </div>

          <!-- Product Photo Upload + Optional URL -->
          <div class="space-y-3">
            <span class="block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
              Foto Produk <span class="text-rose-500">*</span>
            </span>

            <!-- Direct File Upload Dropzone -->
            <div
              translate="no"
              class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors"
              :class="
                isDraggingPhoto
                  ? 'border-[#556256] bg-[#F3F5F2]'
                  : 'border-[#CFC8BE] bg-[#FAF8F5] hover:border-[#556256] hover:bg-white'
              "
              @click="triggerProductPhotoPicker"
              @dragover.prevent="isDraggingPhoto = true"
              @dragleave.prevent="isDraggingPhoto = false"
              @drop.prevent="handlePhotoDrop"
            >
              <Loader2 v-if="isUploadingImage" class="h-6 w-6 animate-spin text-[#556256]" />
              <Upload v-else class="h-6 w-6 text-[#556256]" />
              <span class="mt-2 text-xs font-semibold text-[#2B2A28]">
                <span v-if="isUploadingImage">Mengunggah foto produk...</span>
                <span v-else>Klik atau Tarik Foto ke Sini untuk Upload</span>
              </span>
              <span class="mt-0.5 text-[11px] text-[#8A837A]">
                Mendukung JPG, PNG, WEBP (maks. 10 MB) &bull; Bisa pilih beberapa foto sekaligus
              </span>
              <button
                type="button"
                :disabled="isUploadingImage"
                class="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#2B2A28] px-3.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-[#3F3D39] disabled:opacity-60"
                @click.stop="triggerProductPhotoPicker"
              >
                <Upload class="h-3.5 w-3.5" />
                <span>{{ isUploadingImage ? 'Mengunggah...' : 'Pilih Foto dari Komputer / Galeri' }}</span>
              </button>
            </div>
            <input
              ref="productPhotoInput"
              type="file"
              accept="image/*"
              multiple
              class="hidden"
              :disabled="isUploadingImage"
              @change="handleProductPhotoUpload"
            >
            <p
              v-if="uploadError"
              class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
            >
              {{ uploadError }}
            </p>

            <!-- Uploaded Gallery Thumbnails -->
            <div v-if="form.gallery.length > 0" class="flex flex-wrap gap-2.5">
              <div
                v-for="url in form.gallery"
                :key="url"
                class="group relative h-20 w-16 overflow-hidden rounded-lg border-2 bg-[#EFECE7]"
                :class="form.imageUrl === url ? 'border-[#556256]' : 'border-[#E8E3DC]'"
              >
                <img
                  :src="url"
                  alt="Foto produk terunggah"
                  class="h-full w-full cursor-pointer object-cover object-top"
                  title="Klik untuk jadikan foto utama"
                  @click="setAsMainPhoto(url)"
                >
                <span
                  v-if="form.imageUrl === url"
                  class="absolute bottom-0 inset-x-0 bg-[#556256]/90 py-0.5 text-center text-[9px] font-semibold text-white"
                >
                  Utama
                </span>
                <button
                  type="button"
                  class="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-[#9E5245] shadow hover:bg-white"
                  title="Hapus foto"
                  @click="removeGalleryPhoto(url)"
                >
                  <Trash2 class="h-3 w-3" />
                </button>
              </div>
            </div>

            <!-- Optional URL Input & Quick Samples -->
            <div>
              <label for="item-image" class="mb-1 block text-[10.5px] font-medium text-[#8A837A]">
                Atau masukkan URL foto / pilih contoh cepat:
              </label>
              <input
                id="item-image"
                v-model="form.imageUrl"
                type="text"
                required
                placeholder="https://... atau hasil upload otomatis muncul di sini"
                class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2 text-xs text-[#2B2A28] placeholder:text-[#A39C93] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
              >
              <div class="mt-2 flex flex-wrap items-center gap-1.5">
                <span class="text-[11px] text-[#8A837A]">Contoh cepat:</span>
                <button
                  v-for="sample in sampleImages"
                  :key="sample.label"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-md border border-[#E8E3DC] bg-[#FAF8F5] px-2.5 py-1 text-[11px] font-medium text-[#6B655E] transition-colors hover:border-[#2B2A28] hover:text-[#2B2A28]"
                  @click="setAsMainPhoto(sample.url)"
                >
                  <ImagePlus class="h-3 w-3" />
                  {{ sample.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label for="item-desc" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
              Deskripsi Lengkap <span class="text-rose-500">*</span>
            </label>
            <textarea
              id="item-desc"
              v-model="form.description"
              rows="4"
              required
              placeholder="Jelaskan detail bahan, lingkar dada, kelengkapan (bustier, kain lilit, selendang, bros), dan aturan penyewaan..."
              class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] placeholder:text-[#A39C93] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
            />
          </div>

          <!-- Error -->
          <p
            v-if="formError"
            class="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700"
          >
            {{ formError }}
          </p>

          <!-- Submit -->
          <div class="pt-1">
            <button
              type="submit"
              :disabled="isSubmitting"
              class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2B2A28] px-6 py-3 text-xs font-medium tracking-wide text-white transition-all hover:bg-[#3F3D39] active:scale-[0.99] disabled:opacity-60 sm:w-auto"
            >
              <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
              <PlusCircle v-else class="h-4 w-4" />
              <span>{{ isSubmitting ? 'Menayangkan Busana...' : 'Tayangkan ke Katalog Utama' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- Right: Editorial Card Live Preview -->
    <div class="lg:col-span-5 xl:col-span-4">
      <div class="rounded-2xl border border-[#E8E3DC] bg-white p-5 lg:sticky lg:top-24">
        <div class="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
          <Sparkles class="h-3.5 w-3.5 text-[#556256]" />
          Pratinjau Kartu Katalog
        </div>

        <div class="flex flex-col">
          <div class="relative aspect-[3/3.7] w-full overflow-hidden rounded-xl bg-[#EFECE7]">
            <img
              v-if="form.imageUrl && !previewImgBroken"
              :src="form.imageUrl"
              :alt="form.name || 'Pratinjau busana'"
              class="h-full w-full object-cover object-top"
              @error="previewImgBroken = true"
            >
            <div
              v-else
              class="flex h-full w-full flex-col items-center justify-center text-[#8A837A]"
            >
              <ImagePlus class="h-8 w-8" />
              <span class="mt-2 text-xs">Pratinjau Foto Busana</span>
            </div>

            <span class="absolute left-3 top-3 rounded-full bg-[#6F7F6C] px-2.5 py-0.5 text-[10px] font-medium text-white">
              Tersedia
            </span>
            <span class="absolute bottom-2.5 left-2.5 rounded-md bg-[#FAF8F5]/90 px-2 py-0.5 text-[10px] font-medium text-[#2B2A28]">
              Size {{ form.sizes.join(' · ') }}
            </span>
          </div>

          <div class="pt-3">
            <h3 class="line-clamp-2 text-sm font-medium text-[#2B2A28]">
              {{ form.name || 'Nama Dress atau Kebaya Anda Akan Tampil di Sini' }}
            </h3>
            <div class="mt-1.5 flex items-center justify-between text-[11px] text-[#8A837A]">
              <div class="flex items-center gap-0.5">
                <Star v-for="n in 5" :key="n" class="h-3 w-3 fill-[#C8A26A] text-[#C8A26A]" />
                <span class="ml-1 font-medium text-[#6B655E]">5.0</span>
              </div>
              <span class="inline-flex items-center gap-0.5">
                <MapPin class="h-3 w-3" />
                {{ form.location || 'Kota Anda' }}
              </span>
            </div>
            <div class="mt-2.5 flex items-center justify-between pt-0.5">
              <div>
                <p class="text-[15px] font-semibold text-[#2B2A28]">
                  {{ formatRupiah(Number(form.pricePerDay) || 0) }}
                  <span class="text-[11px] font-normal text-[#8A837A]">/paket 3 hr</span>
                </p>
                <p class="text-[10px] text-[#8A837A]">
                  Deposit {{ formatRupiah(Number(form.deposit) || 0) }}
                </p>
              </div>
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFECE7] text-[#2B2A28]">
                <ShoppingBag class="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
