export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') {
    return
  }

  const { user, loaded, fetchMe } = useAuth()
  if (!loaded.value) {
    await fetchMe()
  }

  if (!user.value) {
    if (to.path === '/' && !to.hash && Object.keys(to.query).length === 0) {
      return navigateTo('/login', { replace: true })
    }
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`, { replace: true })
  }
})
