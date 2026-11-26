export interface WhatsAppProductContext {
  id: string
  name: string
  category?: string
  pricePerDay?: number
}

export function useWhatsAppConsult() {
  const isOpen = useState<boolean>('seruni-wa-open', () => false)
  const activeProduct = useState<WhatsAppProductContext | null>('seruni-wa-product', () => null)
  const draftMessage = useState<string>('seruni-wa-draft', () => '')

  const config = useRuntimeConfig()
  const whatsappNumber = computed(() => {
    const raw = String(config.public?.whatsappNumber || '6281234567890')
    return raw.replace(/[^0-9]/g, '') || '6281234567890'
  })

  function setActiveProduct(product: WhatsAppProductContext | null) {
    activeProduct.value = product
  }

  function openWidget(prefill?: string) {
    if (prefill !== undefined) {
      draftMessage.value = prefill
    }
    isOpen.value = true
  }

  function closeWidget() {
    isOpen.value = false
  }

  function buildWhatsAppUrl(message: string) {
    const text = message.trim() || 'Halo Admin Seruni Atelier, saya ingin konsultasi sewa busana.'
    return `https://wa.me/${whatsappNumber.value}?text=${encodeURIComponent(text)}`
  }

  return {
    isOpen,
    activeProduct,
    draftMessage,
    whatsappNumber,
    setActiveProduct,
    openWidget,
    closeWidget,
    buildWhatsAppUrl,
  }
}
