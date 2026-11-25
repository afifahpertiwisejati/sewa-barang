import type { NotificationRecord, NotificationsListResponse } from '#shared/types/rental'

export function useNotifications() {
  const { isLoggedIn, user } = useAuth()
  const toast = useToast()

  const notifications = useState<NotificationRecord[]>('sewain-notifications', () => [])
  const unreadCount = useState<number>('sewain-notifications-unread', () => 0)
  const loading = useState<boolean>('sewain-notifications-loading', () => false)
  const initialized = useState<boolean>('sewain-notifications-init', () => false)
  const seenIds = useState<string[]>('sewain-notifications-seen', () => [])
  const ownerKey = useState<string>('sewain-notifications-owner', () => '')

  const resetNotifications = () => {
    notifications.value = []
    unreadCount.value = 0
    loading.value = false
    initialized.value = false
    seenIds.value = []
    ownerKey.value = ''
  }

  const fetchNotifications = async (options: { notifyNew?: boolean, silent?: boolean } = {}) => {
    if (!isLoggedIn.value || !user.value) {
      resetNotifications()
      return
    }

    const currentOwner = `${user.value.id}:${user.value.role}`
    if (ownerKey.value && ownerKey.value !== currentOwner) {
      resetNotifications()
    }
    ownerKey.value = currentOwner

    if (!options.silent) {
      loading.value = true
    }

    try {
      const res = await $fetch<NotificationsListResponse>('/api/notifications', {
        query: { limit: 30 },
      })

      const incoming = res.notifications ?? []

      if (options.notifyNew && initialized.value && import.meta.client) {
        const known = new Set(seenIds.value)
        const freshUnread = incoming.filter(n => !n.isRead && !known.has(n.id))
        if (freshUnread.length > 0) {
          for (const item of freshUnread.slice(0, 2)) {
            toast.push(item.title, {
              description: item.message,
              type: item.type === 'booking_cancelled' ? 'error' : 'info',
            })
          }
          // Refresh live booking lists when new transaction notification arrives
          refreshNuxtData('nav-bookings').catch(() => {})
        }
      }

      notifications.value = incoming
      unreadCount.value = Number(res.unreadCount || 0)
      seenIds.value = incoming.map(n => n.id)
      initialized.value = true
    }
    catch {
      // Ignore transient network errors during background polling
    }
    finally {
      if (!options.silent) {
        loading.value = false
      }
    }
  }

  const markAsRead = async (id: string) => {
    const target = notifications.value.find(n => n.id === id)
    if (target && !target.isRead) {
      target.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      try {
        await $fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
          method: 'PATCH',
        })
      }
      catch {
        await fetchNotifications({ silent: true })
      }
    }
  }

  const markAllAsRead = async () => {
    if (unreadCount.value === 0) return
    notifications.value = notifications.value.map(n => ({ ...n, isRead: true }))
    unreadCount.value = 0
    try {
      await $fetch('/api/notifications/read-all', {
        method: 'POST',
      })
    }
    catch {
      await fetchNotifications({ silent: true })
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    resetNotifications,
  }
}
