<template>
  <div class="flex min-h-screen flex-col bg-[#FAF8F5] text-[#2B2A28]">
    <AppNavbar />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
    <ToastContainer />
  </div>
</template>
