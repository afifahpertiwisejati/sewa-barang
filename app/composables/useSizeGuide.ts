import type { RentalCategory } from '#shared/types/rental'

export type SizeGuideTab = 'wanita' | 'jas' | 'heels' | 'pantofel'

export function useSizeGuide() {
  const isOpen = useState<boolean>('seruni-size-guide-open', () => false)
  const activeTab = useState<SizeGuideTab>('seruni-size-guide-tab', () => 'wanita')

  const tabFromCategory = (category?: RentalCategory | string): SizeGuideTab => {
    if (category === 'Jas Pria') return 'jas'
    if (category === 'High Heels') return 'heels'
    if (category === 'Sepatu Pantofel') return 'pantofel'
    return 'wanita'
  }

  const openSizeGuide = (tabOrCategory?: SizeGuideTab | RentalCategory | string) => {
    if (tabOrCategory) {
      if (['wanita', 'jas', 'heels', 'pantofel'].includes(tabOrCategory)) {
        activeTab.value = tabOrCategory as SizeGuideTab
      }
      else {
        activeTab.value = tabFromCategory(tabOrCategory)
      }
    }
    isOpen.value = true
  }

  const closeSizeGuide = () => {
    isOpen.value = false
  }

  return {
    isOpen,
    activeTab,
    openSizeGuide,
    closeSizeGuide,
  }
}
