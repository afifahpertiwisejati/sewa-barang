<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles } from 'lucide-vue-next'
import {
  DRY_CLEAN_BUFFER_AFTER_DAYS,
  DRY_CLEAN_BUFFER_BEFORE_DAYS,
  shiftIsoDate,
  type BookedDateRange,
} from '#shared/types/rental'

const props = defineProps<{
  startDate: string
  endDate: string
  minDate: string
  bookedRanges: BookedDateRange[]
  variantLabel?: string
}>()

const emit = defineEmits<{
  'update:startDate': [val: string]
  'update:endDate': [val: string]
}>()

const { formatDate } = useFormatters()

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const WEEKDAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function parseIsoParts(iso: string): { year: number, month: number, day: number } {
  const parts = iso.split('-').map(Number)
  const now = new Date()
  return {
    year: parts[0] || now.getFullYear(),
    month: parts[1] ? parts[1] - 1 : now.getMonth(),
    day: parts[2] || now.getDate(),
  }
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

const initialParts = parseIsoParts(props.startDate || props.minDate)
const viewYear = ref(initialParts.year)
const viewMonth = ref(initialParts.month)
const pickingEnd = ref(false)
const rangeWarning = ref('')

const minParts = computed(() => parseIsoParts(props.minDate))

const canGoPrevMonth = computed(() => {
  if (viewYear.value > minParts.value.year) return true
  return viewYear.value === minParts.value.year && viewMonth.value > minParts.value.month
})

const monthTitle = computed(() => `${MONTH_NAMES_ID[viewMonth.value]} ${viewYear.value}`)

function prevMonth() {
  if (!canGoPrevMonth.value) return
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  }
  else {
    viewMonth.value -= 1
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  }
  else {
    viewMonth.value += 1
  }
}

function getDateStatus(iso: string): {
  status: 'past' | 'booked' | 'buffer' | 'available'
  range?: BookedDateRange
  bufferKind?: 'before' | 'after'
} {
  if (iso < props.minDate) {
    return { status: 'past' }
  }

  const direct = props.bookedRanges.find(r => iso >= r.startDate && iso <= r.endDate)
  if (direct) {
    return { status: 'booked', range: direct }
  }

  for (const r of props.bookedRanges) {
    const beforeStart = shiftIsoDate(r.startDate, -DRY_CLEAN_BUFFER_BEFORE_DAYS)
    const beforeEnd = shiftIsoDate(r.startDate, -1)
    if (iso >= beforeStart && iso <= beforeEnd) {
      return { status: 'buffer', range: r, bufferKind: 'before' }
    }

    const afterStart = shiftIsoDate(r.endDate, 1)
    const afterEnd = shiftIsoDate(r.endDate, DRY_CLEAN_BUFFER_AFTER_DAYS)
    if (iso >= afterStart && iso <= afterEnd) {
      return { status: 'buffer', range: r, bufferKind: 'after' }
    }
  }

  return { status: 'available' }
}

interface CalendarCell {
  key: string
  day: number | null
  iso: string
  status: 'empty' | 'past' | 'booked' | 'buffer' | 'available'
  isStart: boolean
  isEnd: boolean
  isInRange: boolean
  isToday: boolean
  tooltip: string
}

const calendarCells = computed<CalendarCell[]>(() => {
  const year = viewYear.value
  const month = viewMonth.value
  const firstDayOfWeek = new Date(Date.UTC(year, month, 1)).getUTCDay()
  // Shift Sunday (0) -> 6 so Monday is column 0
  const leadingBlanks = (firstDayOfWeek + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  const cells: CalendarCell[] = []
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({
      key: `blank-${i}`,
      day: null,
      iso: '',
      status: 'empty',
      isStart: false,
      isEnd: false,
      isInRange: false,
      isToday: false,
      tooltip: '',
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toIsoDate(year, month, day)
    const info = getDateStatus(iso)
    const isStart = Boolean(props.startDate && iso === props.startDate)
    const isEnd = Boolean(props.endDate && iso === props.endDate)
    const isInRange = Boolean(
      props.startDate && props.endDate && iso > props.startDate && iso < props.endDate,
    )

    let tooltip = `${formatDate(iso)} — Tersedia`
    if (info.status === 'past') {
      tooltip = 'Tanggal sudah lewat'
    }
    else if (info.status === 'booked' && info.range) {
      tooltip = `Sudah dibooking (${formatDate(info.range.startDate)} – ${formatDate(info.range.endDate)})`
    }
    else if (info.status === 'buffer' && info.range) {
      tooltip = info.bufferKind === 'before'
        ? `Masa jeda persiapan & steam H-1 sebelum jadwal sewa ${formatDate(info.range.startDate)}`
        : `Masa jeda dry-clean & sterilisasi UV (H+1 s/d H+${DRY_CLEAN_BUFFER_AFTER_DAYS}) setelah sewa ${formatDate(info.range.endDate)}`
    }

    cells.push({
      key: iso,
      day,
      iso,
      status: info.status,
      isStart,
      isEnd,
      isInRange,
      isToday: iso === props.minDate,
      tooltip,
    })
  }

  return cells
})

function hasBlockedDateBetween(startIso: string, endIso: string): boolean {
  let cursor = startIso
  let guard = 0
  while (cursor <= endIso && guard < 120) {
    const info = getDateStatus(cursor)
    if (info.status !== 'available') {
      return true
    }
    cursor = shiftIsoDate(cursor, 1)
    guard += 1
  }
  return false
}

function handleDayClick(cell: CalendarCell) {
  if (cell.status !== 'available' || !cell.iso) return
  rangeWarning.value = ''

  if (!pickingEnd.value || !props.startDate || cell.iso < props.startDate) {
    emit('update:startDate', cell.iso)
    emit('update:endDate', cell.iso)
    pickingEnd.value = true
    return
  }

  if (hasBlockedDateBetween(props.startDate, cell.iso)) {
    rangeWarning.value = 'Rentang melewati tanggal terpesan / masa jeda dry-clean. Silakan pilih tanggal selesai lain.'
    emit('update:startDate', cell.iso)
    emit('update:endDate', cell.iso)
    pickingEnd.value = true
    return
  }

  emit('update:endDate', cell.iso)
  pickingEnd.value = false
}

watch(
  () => props.bookedRanges,
  () => {
    rangeWarning.value = ''
  },
)
</script>

<template>
  <div class="rounded-xl border border-[#E8E3DC] bg-[#FAF8F5] p-3.5">
    <!-- Header + Selected Dates Summary -->
    <div class="mb-3 flex items-center justify-between gap-2">
      <span class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B655E]">
        <CalendarDays class="h-3.5 w-3.5 text-[#556256]" />
        Kalender Ketersediaan
      </span>
      <span
        v-if="pickingEnd"
        class="rounded-full bg-[#2B2A28] px-2 py-0.5 text-[10px] font-medium text-white"
      >
        Klik tgl selesai
      </span>
      <span
        v-else-if="props.variantLabel"
        class="truncate text-[10.5px] font-medium text-[#556256]"
      >
        {{ props.variantLabel }}
      </span>
    </div>

    <!-- Selected Start & End Display Boxes -->
    <div class="mb-3 grid grid-cols-2 gap-2">
      <div
        class="rounded-lg border px-2.5 py-2 transition-colors"
        :class="
          !pickingEnd
            ? 'border-[#E8E3DC] bg-white'
            : 'border-[#556256] bg-white ring-1 ring-[#556256]/30'
        "
      >
        <span class="block text-[9.5px] font-medium uppercase tracking-wider text-[#8A837A]">
          Tanggal Mulai
        </span>
        <span class="mt-0.5 block text-xs font-semibold text-[#2B2A28]">
          {{ props.startDate ? formatDate(props.startDate) : 'Pilih tanggal' }}
        </span>
      </div>
      <div
        class="rounded-lg border px-2.5 py-2 transition-colors"
        :class="
          pickingEnd
            ? 'border-[#2B2A28] bg-white ring-1 ring-[#2B2A28]/20'
            : 'border-[#E8E3DC] bg-white'
        "
      >
        <span class="block text-[9.5px] font-medium uppercase tracking-wider text-[#8A837A]">
          Tanggal Selesai
        </span>
        <span class="mt-0.5 block text-xs font-semibold text-[#2B2A28]">
          {{ props.endDate ? formatDate(props.endDate) : 'Pilih tanggal' }}
        </span>
      </div>
    </div>

    <!-- Month Navigation -->
    <div class="rounded-xl border border-[#EFECE7] bg-white p-2.5">
      <div class="mb-2 flex items-center justify-between">
        <button
          type="button"
          :disabled="!canGoPrevMonth"
          class="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EFECE7] text-[#2B2A28] transition-colors hover:bg-[#FAF8F5] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Bulan sebelumnya"
          @click="prevMonth"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>

        <span class="text-xs font-semibold text-[#2B2A28]">
          {{ monthTitle }}
        </span>

        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EFECE7] text-[#2B2A28] transition-colors hover:bg-[#FAF8F5]"
          aria-label="Bulan berikutnya"
          @click="nextMonth"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>

      <!-- Weekday Labels -->
      <div class="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wider text-[#8A837A]">
        <span v-for="dayName in WEEKDAYS_ID" :key="dayName" class="py-1">
          {{ dayName }}
        </span>
      </div>

      <!-- Day Cells -->
      <div class="grid grid-cols-7 gap-1">
        <template v-for="cell in calendarCells" :key="cell.key">
          <div v-if="cell.status === 'empty'" class="h-8" />
          <button
            v-else
            type="button"
            :disabled="cell.status !== 'available'"
            :title="cell.tooltip"
            class="relative flex h-8 w-full items-center justify-center rounded-lg text-[11.5px] transition-all"
            :class="
              cell.status === 'past'
                ? 'cursor-not-allowed text-[#CBC5BC]'
                : cell.status === 'booked'
                  ? 'cursor-not-allowed bg-[#E8E4DE] text-[#8E877E] line-through decoration-[#8E877E]/80'
                  : cell.status === 'buffer'
                    ? 'cursor-not-allowed border border-dashed border-[#E3C696] bg-[#FDF4E3] text-[#9A6F2E] line-through decoration-[#9A6F2E]/70'
                    : (cell.isStart || cell.isEnd)
                      ? 'bg-[#2B2A28] font-semibold text-white shadow-sm'
                      : cell.isInRange
                        ? 'bg-[#E5ECE4] font-medium text-[#2B2A28]'
                        : 'border border-transparent font-medium text-[#2B2A28] hover:border-[#556256] hover:bg-[#F3F5F2]'
            "
            @click="handleDayClick(cell)"
          >
            <span>{{ cell.day }}</span>
            <span
              v-if="cell.isToday && cell.status === 'available' && !cell.isStart && !cell.isEnd"
              class="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#556256]"
            />
          </button>
        </template>
      </div>
    </div>

    <!-- Range Warning (if user tried spanning over booked/buffer dates) -->
    <p
      v-if="rangeWarning"
      class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800"
    >
      {{ rangeWarning }}
    </p>

    <!-- Legend -->
    <div class="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10.5px] text-[#6B655E]">
      <span class="inline-flex items-center gap-1.5">
        <span class="h-3 w-3 rounded bg-[#2B2A28]" />
        Dipilih
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="flex h-3.5 w-4 items-center justify-center rounded bg-[#E8E4DE] text-[8px] text-[#8E877E] line-through">12</span>
        Dibooking
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="flex h-3.5 w-4 items-center justify-center rounded border border-dashed border-[#E3C696] bg-[#FDF4E3] text-[8px] text-[#9A6F2E] line-through">13</span>
        Jeda Dry-Clean
      </span>
    </div>

    <!-- Dry-Clean Buffer Explanation -->
    <div class="mt-2.5 flex items-start gap-2 rounded-lg border border-[#E6DFD3] bg-white px-2.5 py-2 text-[10.5px] leading-relaxed text-[#6B655E]">
      <Sparkles class="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#556256]" />
      <p>
        <strong class="text-[#2B2A28]">Masa Jeda Dry-Clean (1–2 Hari):</strong>
        Setiap jadwal sewa otomatis dikunci <strong>{{ DRY_CLEAN_BUFFER_BEFORE_DAYS }} hari sebelum</strong> (steam &amp; QC) dan <strong>{{ DRY_CLEAN_BUFFER_AFTER_DAYS }} hari sesudah</strong> (dry-clean &amp; sterilisasi UV) agar busana selalu wangi &amp; higienis.
      </p>
    </div>
  </div>
</template>
