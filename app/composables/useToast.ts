export interface ToastItem {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'info'
}

export function useToast() {
  const toasts = useState<ToastItem[]>('sewain-toasts', () => [])

  const dismiss = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const push = (
    title: string,
    options?: { description?: string, type?: ToastItem['type'], duration?: number },
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const toast: ToastItem = {
      id,
      title,
      description: options?.description,
      type: options?.type ?? 'success',
    }
    toasts.value.push(toast)

    if (import.meta.client) {
      setTimeout(() => {
        dismiss(id)
      }, options?.duration ?? 4200)
    }
  }

  return {
    toasts,
    push,
    dismiss,
  }
}
