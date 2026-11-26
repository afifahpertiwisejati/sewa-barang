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
    const digits = String(config.public?.whatsappNumber || '6283130495590').replace(/[^0-9]/g, '')
    if (!digits) return '6283130495590'
    return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
  })

  const displayPhone = computed(() => {
    const local = whatsappNumber.value.startsWith('62')
      ? `0${whatsappNumber.value.slice(2)}`
      : whatsappNumber.value
    if (local.length === 12) {
      return `${local.slice(0, 4)}-${local.slice(4, 8)}-${local.slice(8)}`
    }
    return local
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
    displayPhone,
    setActiveProduct,
    openWidget,
    closeWidget,
    buildWhatsAppUrl,
  }
}
