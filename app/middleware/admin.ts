export default defineNuxtRouteMiddleware(async (to) => {
  const { user, loaded, fetchMe } = useAuth()
  if (!loaded.value) {
    await fetchMe()
  }

  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  if (user.value.role !== 'admin') {
    if (import.meta.client) {
      const toast = useToast()
      toast.push('Akses Khusus Admin', {
        description: 'Halaman Panel Admin hanya dapat diakses oleh akun Admin Butik.',
        type: 'error',
      })
    }
    return navigateTo('/dashboard')
  }
})
