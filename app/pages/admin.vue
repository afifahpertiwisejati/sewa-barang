<script setup lang="ts">
import {
  Check,
  ClipboardList,
  ExternalLink,
  Loader2,
  Package,
  Pencil,
  PlusCircle,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-vue-next'
import {
  AVAILABLE_SIZES,
  SHOE_SIZES_MEN,
  SHOE_SIZES_WOMEN,
  type BookingRecord,
  type ItemsListResponse,
  type RentalItem,
} from '#shared/types/rental'

definePageMeta({
  middleware: ['admin'],
})

useHead({
  title: 'Panel Admin Butik — SewaIn+',
})

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { formatRupiah } = useFormatters()
const { fetchNotifications } = useNotifications()
const toast = useToast()

type AdminTab = 'orders' | 'catalog' | 'create'

const initialTab: AdminTab
  = route.query.tab === 'create'
    ? 'create'
    : route.query.tab === 'catalog'
      ? 'catalog'
      : 'orders'

const activeTab = ref<AdminTab>(initialTab)
const catalogSearch = ref('')
const editingItemId = ref<string | null>(null)
const editForm = reactive({
  name: '',
  pricePerDay: 0,
  deposit: 0,
  status: 'Tersedia' as RentalItem['status'],
  sizes: [] as string[],
  customSize: '',
  imageUrl: '',
})
const savingEdit = ref(false)
const uploadingEditPhoto = ref(false)
const deletingId = ref<string | null>(null)

watch(() => route.query.tab, (tab) => {
  if (tab === 'create') activeTab.value = 'create'
  else if (tab === 'catalog') activeTab.value = 'catalog'
  else activeTab.value = 'orders'
})

function switchTab(tab: AdminTab) {
  activeTab.value = tab
  router.replace({ query: tab === 'orders' ? {} : { tab } })
}

const {
  data: bookings,
  pending: bookingsPending,
  refresh: refreshBookings,
} = await useFetch<BookingRecord[]>('/api/bookings', {
  default: () => [],
})

const {
  data: catalogData,
  refresh: refreshCatalog,
} = await useFetch<ItemsListResponse>('/api/items')

const catalogItems = computed(() => {
  const list = catalogData.value?.items ?? []
  const q = catalogSearch.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(item =>
    item.name.toLowerCase().includes(q)
    || item.category.toLowerCase().includes(q)
    || item.location.toLowerCase().includes(q),
  )
})

const stats = computed(() => {
  const orders = bookings.value ?? []
  const activeOrders = orders.filter(b => b.status === 'aktif')
  const pendingRefundOrders = orders.filter(
    b => b.status !== 'dibatalkan' && b.deposit > 0 && b.depositStatus === 'menunggu_pengembalian',
  )
  const pendingRefundTotal = pendingRefundOrders.reduce((sum, b) => sum + b.deposit, 0)
  const revenue = orders
    .filter(b => b.status !== 'dibatalkan')
    .reduce((sum, b) => sum + b.subtotal, 0)

  return {
    totalItems: catalogData.value?.total ?? 0,
    totalOrders: orders.length,
    activeOrders: activeOrders.length,
    pendingRefundCount: pendingRefundOrders.length,
    pendingRefundTotal,
    revenue,
  }
})

function getSizeOptionsForItem(item: RentalItem): string[] {
  const base = item.category === 'High Heels'
    ? [...SHOE_SIZES_WOMEN]
    : item.category === 'Sepatu Pantofel'
      ? [...SHOE_SIZES_MEN]
      : [...AVAILABLE_SIZES]
  return Array.from(new Set([...base, ...editForm.sizes]))
}

function toggleEditSize(size: string) {
  const idx = editForm.sizes.indexOf(size)
  if (idx >= 0) {
    if (editForm.sizes.length <= 1) {
      toast.push('Minimal 1 Ukuran', {
        description: 'Produk harus memiliki minimal 1 ukuran tersedia.',
        type: 'info',
      })
      return
    }
    editForm.sizes.splice(idx, 1)
  }
  else {
    editForm.sizes.push(size)
  }
}

function addCustomEditSize() {
  const val = editForm.customSize.trim()
  if (!val) return
  if (!editForm.sizes.includes(val)) {
    editForm.sizes.push(val)
  }
  editForm.customSize = ''
}

function startEdit(item: RentalItem) {
  editingItemId.value = item.id
  editForm.name = item.name
  editForm.pricePerDay = item.pricePerDay
  editForm.deposit = item.deposit
  editForm.status = item.status
  editForm.sizes = [...(item.sizes?.length ? item.sizes : ['All Size'])]
  editForm.customSize = ''
  editForm.imageUrl = item.imageUrl
}

async function handleEditPhotoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingEditPhoto.value = true
  try {
    const optimizedFile = await compressImageFile(file)
    const formData = new FormData()
    formData.append('file', optimizedFile)
    const res = await $fetch<{ url: string }>('/api/uploads/product-image', {
      method: 'POST',
      body: formData,
    })
    editForm.imageUrl = res.url
    toast.push('Foto Produk Diunggah', {
      description: 'Klik Simpan untuk menerapkan foto baru pada produk ini.',
      type: 'success',
    })
  }
  catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    toast.push('Gagal Upload Foto', {
      description: fetchErr?.data?.statusMessage || fetchErr?.statusMessage || fetchErr?.message || 'Format harus JPG/PNG/WEBP (maks. 10 MB).',
      type: 'error',
    })
  }
  finally {
    uploadingEditPhoto.value = false
    input.value = ''
  }
}

function cancelEdit() {
  editingItemId.value = null
}

async function saveEdit(itemId: string) {
  if (editForm.sizes.length === 0) {
    toast.push('Ukuran Wajib Dipilih', {
      description: 'Pilih minimal 1 ukuran sebelum menyimpan.',
      type: 'error',
    })
    return
  }

  savingEdit.value = true
  try {
    await $fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      body: {
        name: editForm.name,
        pricePerDay: editForm.pricePerDay,
        deposit: editForm.deposit,
        status: editForm.status,
        sizes: editForm.sizes,
        imageUrl: editForm.imageUrl,
      },
    })
    editingItemId.value = null
    await refreshCatalog()
    toast.push('Koleksi Diperbarui', {
      description: 'Perubahan nama, ukuran, harga & status produk berhasil disimpan.',
      type: 'success',
    })
  }
  catch {
    toast.push('Gagal Memperbarui Produk', {
      type: 'error',
    })
  }
  finally {
    savingEdit.value = false
  }
}

async function deleteItem(item: RentalItem) {
  deletingId.value = item.id
  try {
    await $fetch(`/api/items/${item.id}`, {
      method: 'DELETE',
    })
    await refreshCatalog()
    toast.push('Produk Dihapus', {
      description: `"${item.name}" telah dihapus dari katalog.`,
      type: 'info',
    })
  }
  catch {
    toast.push('Gagal Menghapus Produk', { type: 'error' })
  }
  finally {
    deletingId.value = null
  }
}

async function handleBookingUpdated() {
  await Promise.all([
    refreshBookings(),
    refreshCatalog(),
    fetchNotifications({ silent: true }),
  ])
}

async function handleItemCreated() {
  await refreshCatalog()
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Admin Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-[#F3F5F2] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#556256] ring-1 ring-[#D7E0D5]">
          <ShieldCheck class="h-3.5 w-3.5" />
          Role Admin Butik
        </span>
        <h1 class="mt-2 font-serif text-3xl font-normal tracking-tight text-[#2B2A28]">
          Panel Admin SewaIn+
        </h1>
        <p class="mt-1 text-xs text-[#8A837A] sm:text-sm">
          Halo, <strong class="text-[#2B2A28]">{{ user?.name }}</strong> — kelola semua pesanan masuk, ubah harga/status, atau tambah koleksi baru.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md bg-[#2B2A28] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#3F3D39]"
          @click="switchTab('create')"
        >
          <PlusCircle class="h-3.5 w-3.5" />
          Tambah Koleksi
        </button>
        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center rounded-md border border-[#E8E3DC] bg-white px-4 py-2.5 text-xs font-medium text-[#2B2A28] hover:border-[#2B2A28]"
        >
          Lihat Katalog
        </NuxtLink>
      </div>
    </div>

    <NotificationBanner />

    <!-- Admin KPI Cards -->
    <div class="mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <div class="rounded-2xl border border-[#E8E3DC] bg-white p-4">
        <div class="flex items-center justify-between">
          <span class="text-xs text-[#8A837A]">Total Koleksi</span>
          <Package class="h-4 w-4 text-[#556256]" />
        </div>
        <p class="mt-2 font-serif text-2xl font-medium text-[#2B2A28]">
          {{ stats.totalItems }}
        </p>
        <p class="mt-0.5 text-[11px] text-[#A39C93]">
          Kebaya, dress, jas &amp; sepatu
        </p>
      </div>

      <div class="rounded-2xl border border-[#E8E3DC] bg-white p-4">
        <div class="flex items-center justify-between">
          <span class="text-xs text-[#8A837A]">Pesanan Aktif</span>
          <ClipboardList class="h-4 w-4 text-[#556256]" />
        </div>
        <p class="mt-2 font-serif text-2xl font-medium text-[#2B2A28]">
          {{ stats.activeOrders }}
        </p>
        <p class="mt-0.5 text-[11px] text-[#A39C93]">
          Dari total {{ stats.totalOrders }} transaksi
        </p>
      </div>

      <div class="rounded-2xl border border-[#E8E3DC] bg-white p-4">
        <div class="flex items-center justify-between">
          <span class="text-xs text-[#8A837A]">Refund Deposit Pending</span>
          <ShieldCheck class="h-4 w-4 text-[#8C5E2A]" />
        </div>
        <p class="mt-2 font-serif text-2xl font-medium text-[#8C5E2A]">
          {{ stats.pendingRefundCount }}
        </p>
        <p class="mt-0.5 text-[11px] text-[#A39C93]">
          {{ stats.pendingRefundTotal > 0 ? `Total ${formatRupiah(stats.pendingRefundTotal)}` : 'Semua deposit aman' }}
        </p>
      </div>

      <div class="rounded-2xl border border-[#E8E3DC] bg-white p-4">
        <div class="flex items-center justify-between">
          <span class="text-xs text-[#8A837A]">Total Pendapatan Sewa</span>
          <Wallet class="h-4 w-4 text-[#556256]" />
        </div>
        <p class="mt-2 font-serif text-2xl font-medium text-[#556256]">
          {{ formatRupiah(stats.revenue) }}
        </p>
        <p class="mt-0.5 text-[11px] text-[#A39C93]">
          Non-deposit (aktif &amp; selesai)
        </p>
      </div>
    </div>

    <!-- Admin Tabs -->
    <div class="mt-8 border-b border-[#E8E3DC]">
      <div class="no-scrollbar flex gap-5 overflow-x-auto" role="tablist">
        <button
          type="button"
          role="tab"
          class="inline-flex shrink-0 items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors"
          :class="activeTab === 'orders' ? 'border-[#2B2A28] text-[#2B2A28]' : 'border-transparent text-[#8A837A] hover:text-[#2B2A28]'"
          @click="switchTab('orders')"
        >
          <ClipboardList class="h-4 w-4" />
          Pesanan Masuk
          <span class="rounded-full bg-[#EFECE7] px-2 py-0.5 text-[11px] font-semibold text-[#2B2A28]">
            {{ stats.totalOrders }}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          class="inline-flex shrink-0 items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors"
          :class="activeTab === 'catalog' ? 'border-[#2B2A28] text-[#2B2A28]' : 'border-transparent text-[#8A837A] hover:text-[#2B2A28]'"
          @click="switchTab('catalog')"
        >
          <Package class="h-4 w-4" />
          Kelola Koleksi
          <span class="rounded-full bg-[#EFECE7] px-2 py-0.5 text-[11px] font-semibold text-[#2B2A28]">
            {{ stats.totalItems }}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          class="inline-flex shrink-0 items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors"
          :class="activeTab === 'create' ? 'border-[#2B2A28] text-[#2B2A28]' : 'border-transparent text-[#8A837A] hover:text-[#2B2A28]'"
          @click="switchTab('create')"
        >
          <PlusCircle class="h-4 w-4" />
          Tambah Koleksi Baru
        </button>
      </div>
    </div>

    <!-- Tab 1: All Incoming Orders -->
    <div v-if="activeTab === 'orders'" class="mt-6">
      <MyRentalsTab
        :bookings="bookings ?? []"
        :pending="bookingsPending"
        @updated="handleBookingUpdated"
      />
    </div>

    <!-- Tab 2: Manage Catalog CRUD -->
    <div v-else-if="activeTab === 'catalog'" class="mt-6 space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full max-w-sm">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A837A]" />
          <input
            v-model="catalogSearch"
            type="text"
            placeholder="Cari nama produk, kategori, atau kota..."
            class="w-full rounded-lg border border-[#E8E3DC] bg-white py-2 pl-9 pr-3 text-xs text-[#2B2A28] focus:border-[#556256] focus:outline-none"
          >
        </div>
        <p class="text-xs text-[#8A837A]">
          Menampilkan <strong class="text-[#2B2A28]">{{ catalogItems.length }}</strong> produk
        </p>
      </div>

      <div class="overflow-hidden rounded-2xl border border-[#E8E3DC] bg-white">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#EFECE7] text-left text-xs">
            <thead class="bg-[#FAF8F5] text-[11px] font-medium uppercase tracking-wider text-[#8A837A]">
              <tr>
                <th class="px-4 py-3">Produk</th>
                <th class="px-4 py-3">Kategori</th>
                <th class="px-4 py-3">Harga / Hari</th>
                <th class="px-4 py-3">Deposit</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#EFECE7]">
              <tr v-for="item in catalogItems" :key="item.id" class="hover:bg-[#FAF8F5]/70">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="flex shrink-0 flex-col items-center gap-1.5">
                      <div class="relative h-12 w-10 overflow-hidden rounded-lg bg-[#EFECE7]">
                        <img
                          :src="editingItemId === item.id ? editForm.imageUrl : item.imageUrl"
                          :alt="item.name"
                          class="h-full w-full object-cover object-top"
                        >
                        <label
                          v-if="editingItemId === item.id"
                          :for="`edit-photo-${item.id}`"
                          class="absolute inset-0 flex cursor-pointer items-center justify-center bg-[#2B2A28]/55 text-white transition-opacity hover:bg-[#2B2A28]/75"
                          title="Ganti foto produk"
                        >
                          <Loader2 v-if="uploadingEditPhoto" class="h-3.5 w-3.5 animate-spin" />
                          <Upload v-else class="h-3.5 w-3.5" />
                        </label>
                      </div>
                      <label
                        v-if="editingItemId === item.id"
                        :for="`edit-photo-${item.id}`"
                        class="cursor-pointer rounded border border-[#D7E0D5] bg-[#F3F5F2] px-1.5 py-0.5 text-[10px] font-medium text-[#556256] hover:bg-[#E5ECE4]"
                      >
                        {{ uploadingEditPhoto ? 'Upload...' : 'Ganti Foto' }}
                      </label>
                      <input
                        v-if="editingItemId === item.id"
                        :id="`edit-photo-${item.id}`"
                        type="file"
                        accept="image/*"
                        class="sr-only"
                        :disabled="uploadingEditPhoto"
                        @change="handleEditPhotoUpload"
                      >
                    </div>
                    <div class="min-w-0">
                      <input
                        v-if="editingItemId === item.id"
                        v-model="editForm.name"
                        type="text"
                        class="w-56 rounded border border-[#556256] bg-white px-2 py-1 text-xs text-[#2B2A28]"
                      >
                      <NuxtLink
                        v-else
                        :to="`/items/${item.id}`"
                        class="inline-flex items-center gap-1 font-medium text-[#2B2A28] hover:text-[#556256]"
                      >
                        <span class="line-clamp-1 max-w-[260px]">{{ item.name }}</span>
                        <ExternalLink class="h-3 w-3 shrink-0 text-[#A39C93]" />
                      </NuxtLink>
                      <p v-if="editingItemId !== item.id" class="mt-0.5 text-[11px] text-[#8A837A]">
                        {{ item.location }} &bull; Size {{ item.sizes.join(', ') }}
                      </p>
                      <div v-else class="mt-2 space-y-1.5">
                        <div class="flex flex-wrap items-center gap-1">
                          <span class="mr-0.5 text-[10px] font-medium uppercase tracking-wider text-[#8A837A]">Size:</span>
                          <button
                            v-for="sz in getSizeOptionsForItem(item)"
                            :key="sz"
                            type="button"
                            class="rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors"
                            :class="
                              editForm.sizes.includes(sz)
                                ? 'border-[#556256] bg-[#556256] text-white'
                                : 'border-[#E8E3DC] bg-[#FAF8F5] text-[#6B655E] hover:border-[#2B2A28]'
                            "
                            @click="toggleEditSize(sz)"
                          >
                            {{ sz }}
                          </button>
                        </div>
                        <div class="flex items-center gap-1">
                          <input
                            v-model="editForm.customSize"
                            type="text"
                            maxlength="20"
                            placeholder="Tambah size lain (mis. XS / 45)"
                            class="w-40 rounded border border-[#E8E3DC] bg-[#FAF8F5] px-2 py-0.5 text-[10px] text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none"
                            @keydown.enter.prevent="addCustomEditSize"
                          >
                          <button
                            type="button"
                            class="rounded border border-[#D7E0D5] bg-[#F3F5F2] px-2 py-0.5 text-[10px] font-medium text-[#556256] hover:bg-[#E5ECE4]"
                            @click="addCustomEditSize"
                          >
                            + Tambah
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>

                <td class="whitespace-nowrap px-4 py-3 text-[#6B655E]">
                  {{ item.category }}
                </td>

                <td class="whitespace-nowrap px-4 py-3 font-medium text-[#2B2A28]">
                  <input
                    v-if="editingItemId === item.id"
                    v-model.number="editForm.pricePerDay"
                    type="number"
                    step="5000"
                    class="w-28 rounded border border-[#556256] bg-white px-2 py-1 text-xs"
                  >
                  <span v-else>{{ formatRupiah(item.pricePerDay) }}</span>
                </td>

                <td class="whitespace-nowrap px-4 py-3 text-[#6B655E]">
                  <input
                    v-if="editingItemId === item.id"
                    v-model.number="editForm.deposit"
                    type="number"
                    step="10000"
                    class="w-28 rounded border border-[#556256] bg-white px-2 py-1 text-xs"
                  >
                  <span v-else>{{ formatRupiah(item.deposit) }}</span>
                </td>

                <td class="whitespace-nowrap px-4 py-3">
                  <select
                    v-if="editingItemId === item.id"
                    v-model="editForm.status"
                    class="rounded border border-[#556256] bg-white px-2 py-1 text-xs"
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Sedang Disewa">Sedang Disewa</option>
                  </select>
                  <span
                    v-else
                    class="rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white"
                    :class="item.status === 'Tersedia' ? 'bg-[#6F7F6C]' : 'bg-[#9E7B6B]'"
                  >
                    {{ item.status }}
                  </span>
                </td>

                <td class="whitespace-nowrap px-4 py-3 text-right">
                  <div v-if="editingItemId === item.id" class="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      :disabled="savingEdit"
                      class="inline-flex items-center gap-1 rounded-md bg-[#556256] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#455146]"
                      @click="saveEdit(item.id)"
                    >
                      <Check class="h-3.5 w-3.5" />
                      Simpan
                    </button>
                    <button
                      type="button"
                      class="rounded-md border border-[#E8E3DC] p-1 text-[#6B655E] hover:bg-[#FAF8F5]"
                      @click="cancelEdit"
                    >
                      <X class="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div v-else class="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-md border border-[#E8E3DC] bg-white px-2.5 py-1 text-[11px] font-medium text-[#2B2A28] hover:border-[#2B2A28]"
                      @click="startEdit(item)"
                    >
                      <Pencil class="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      :disabled="deletingId === item.id"
                      class="inline-flex items-center gap-1 rounded-md border border-[#E8D0CB] bg-[#FAF4F1] px-2.5 py-1 text-[11px] font-medium text-[#9E5245] hover:bg-[#F3E2DD] disabled:opacity-50"
                      @click="deleteItem(item)"
                    >
                      <Trash2 class="h-3 w-3" />
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab 3: Create New Listing -->
    <div v-else class="mt-6">
      <AddItemForm @created="handleItemCreated" />
    </div>
  </div>
</template>
