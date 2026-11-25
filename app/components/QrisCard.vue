<script setup lang="ts">
import { CheckCircle2, Zap } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  amount: number
  referenceId?: string
  compact?: boolean
  title?: string
  subtitle?: string
  badgeText?: string
  hintText?: string
}>(), {
  referenceId: 'SERUNI-QRIS',
  compact: false,
  title: 'SERUNI ATELIER',
  subtitle: '',
  badgeText: 'Langsung Bayar (Tanpa Scan)',
  hintText: 'Tidak perlu scan kamera — klik tombol konfirmasi untuk langsung memproses transaksi.',
})

const { formatRupiah } = useFormatters()

const merchantName = computed(() => props.title || 'SERUNI ATELIER')
const nmid = 'ID1026008899123'

const qrisPayload = computed(() => {
  const amt = String(Math.max(0, Math.round(props.amount)))
  const ref = (props.referenceId || 'SERUNI').replace(/[^A-Z0-9-]/gi, '').slice(0, 18)
  const sub = (props.subtitle || '').replace(/[^A-Z0-9-]/gi, '').slice(0, 16)
  return `00020101021226610014ID.CO.QRIS.WWW01189360001400008899120215${nmid}52045699530336054${String(amt.length).padStart(2, '0')}${amt}5802ID5916${merchantName.value}6007JAKARTA62${String(ref.length + 4).padStart(2, '0')}05${String(ref.length).padStart(2, '0')}${ref}${sub}6304A7F2`
})

// Crisp 25x25 deterministic QR matrix with standard finder & alignment patterns
const qrMatrix = computed<boolean[][]>(() => {
  const size = 25
  const grid: boolean[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => false))

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4
        grid[r0 + r]![c0 + c] = isBorder || isCenter
      }
    }
  }

  const isReserved = (r: number, c: number) => {
    if (r < 8 && c < 8) return true
    if (r < 8 && c >= size - 8) return true
    if (r >= size - 8 && c < 8) return true
    if (r >= 16 && r <= 20 && c >= 16 && c <= 20) return true
    if (r === 6 || c === 6) return true
    return false
  }

  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  for (let r = 16; r <= 20; r++) {
    for (let c = 16; c <= 20; c++) {
      const dr = Math.abs(r - 18)
      const dc = Math.abs(c - 18)
      grid[r]![c] = dr === 2 || dc === 2 || (dr === 0 && dc === 0)
    }
  }

  for (let i = 8; i < size - 8; i++) {
    grid[6]![i] = i % 2 === 0
    grid[i]![6] = i % 2 === 0
  }

  let seed = 2166136261
  for (const ch of qrisPayload.value) {
    seed ^= ch.charCodeAt(0)
    seed = Math.imul(seed, 16777619)
  }

  const nextBit = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return ((seed >>> 0) % 100) < 52
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isReserved(r, c)) {
        grid[r]![c] = nextBit()
      }
    }
  }

  return grid
})
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white">
    <!-- Top Banner -->
    <div class="flex items-center justify-between bg-[#556256] px-3.5 py-2 text-white">
      <div class="flex items-center gap-1.5">
        <span class="rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-bold tracking-wider">QRIS</span>
        <span class="inline-flex items-center gap-1 text-[10px] text-white/90">
          <Zap class="h-3 w-3" />
          {{ props.badgeText }}
        </span>
      </div>
      <span class="font-mono text-[10px] text-white/80">{{ nmid }}</span>
    </div>

    <!-- Body -->
    <div class="flex flex-col items-center p-3.5 text-center" :class="compact ? 'gap-2' : 'gap-2.5'">
      <div>
        <p class="font-serif text-sm font-semibold text-[#2B2A28]">
          {{ merchantName }}
        </p>
        <p v-if="props.subtitle" class="mt-0.5 font-mono text-[11px] text-[#6B655E]">
          {{ props.subtitle }}
        </p>
        <p class="mt-0.5 text-xs font-semibold text-[#556256]">
          Nominal QRIS: {{ formatRupiah(props.amount) }}
        </p>
      </div>

      <!-- Crisp SVG QRIS Graphic -->
      <div class="rounded-xl border border-[#E8E3DC] bg-white p-2.5 shadow-sm">
        <svg
          :width="compact ? 132 : 164"
          :height="compact ? 132 : 164"
          viewBox="0 0 25 25"
          shape-rendering="crispEdges"
          role="img"
          aria-label="Kode QRIS Seruni Atelier"
        >
          <rect width="25" height="25" fill="#FFFFFF" />
          <template v-for="(row, r) in qrMatrix" :key="r">
            <template v-for="(cell, c) in row" :key="`${r}-${c}`">
              <rect
                v-if="cell"
                :x="c"
                :y="r"
                width="1"
                height="1"
                fill="#2B2A28"
              />
            </template>
          </template>
        </svg>
      </div>

      <p class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F3F5F2] px-3 py-1.5 text-[10.5px] font-medium text-[#384239]">
        <CheckCircle2 class="h-3.5 w-3.5 shrink-0 text-[#556256]" />
        <span>{{ props.hintText }}</span>
      </p>
    </div>
  </div>
</template>
