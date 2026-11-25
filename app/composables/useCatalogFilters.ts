import type { CategoryFilter, SortOption } from '#shared/types/rental'

export interface CatalogFilterState {
  q: string
  location: string
  category: CategoryFilter
  startDate: string
  endDate: string
  maxPrice: number
  sort: SortOption
  availableOnly: boolean
}

export const DEFAULT_MAX_PRICE = 200000

export function useCatalogFilters() {
  const filters = useState<CatalogFilterState>('sewain-catalog-filters', () => ({
    q: '',
    location: '',
    category: 'Semua',
    startDate: '',
    endDate: '',
    maxPrice: DEFAULT_MAX_PRICE,
    sort: 'newest',
    availableOnly: false,
  }))

  const hasActiveFilters = computed(() => {
    return (
      filters.value.q.trim() !== ''
      || filters.value.location.trim() !== ''
      || filters.value.category !== 'Semua'
      || filters.value.startDate !== ''
      || filters.value.endDate !== ''
      || filters.value.maxPrice < DEFAULT_MAX_PRICE
      || filters.value.availableOnly
      || filters.value.sort !== 'newest'
    )
  })

  const resetFilters = () => {
    filters.value = {
      q: '',
      location: '',
      category: 'Semua',
      startDate: '',
      endDate: '',
      maxPrice: DEFAULT_MAX_PRICE,
      sort: 'newest',
      availableOnly: false,
    }
  }

  return {
    filters,
    hasActiveFilters,
    resetFilters,
  }
}
