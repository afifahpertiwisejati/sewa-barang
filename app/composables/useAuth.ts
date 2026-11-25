import type { AuthResponse, AuthUser, RegisterPayload } from '#shared/types/auth'

export function useAuth() {
  const user = useState<AuthUser | null>('sewain-auth-user', () => null)
  const loaded = useState<boolean>('sewain-auth-loaded', () => false)

  const isLoggedIn = computed(() => Boolean(user.value))
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isUser = computed(() => user.value?.role === 'user')

  const fetchMe = async (force = false) => {
    if (loaded.value && !force) return user.value
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const res = await $fetch<AuthResponse>('/api/auth/me', { headers })
      user.value = res.user
    }
    catch {
      user.value = null
    }
    finally {
      loaded.value = true
    }
    return user.value
  }

  const login = async (email: string, password: string) => {
    const res = await $fetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    user.value = res.user
    loaded.value = true
    await refreshNuxtData('nav-bookings')
    return res.user
  }

  const register = async (payload: RegisterPayload) => {
    const res = await $fetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: payload,
    })
    user.value = res.user
    loaded.value = true
    await refreshNuxtData('nav-bookings')
    return res.user
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    loaded.value = true
    await refreshNuxtData('nav-bookings')
  }

  return {
    user,
    loaded,
    isLoggedIn,
    isAdmin,
    isUser,
    fetchMe,
    login,
    register,
    logout,
  }
}
