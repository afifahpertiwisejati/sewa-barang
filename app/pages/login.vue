<script setup lang="ts">
import { ArrowRight, Loader2, Lock, ShieldCheck, Sparkles } from 'lucide-vue-next'

useHead({
  title: 'Masuk & Daftar — Seruni Atelier',
})

const route = useRoute()
const router = useRouter()
const { user, login, register } = useAuth()
const toast = useToast()

const initialMode: 'login' | 'register' | 'admin'
  = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/admin')
    ? 'admin'
    : 'login'

const mode = ref<'login' | 'register' | 'admin'>(initialMode)
const isSubmitting = ref(false)
const errorMessage = ref('')

const loginForm = reactive({
  email: '',
  password: '',
})

const adminForm = reactive({
  username: '',
  password: '',
})

const registerForm = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
})

function getPostLoginTarget(role: 'user' | 'admin') {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  if (redirect && redirect.startsWith('/')) {
    if (redirect.startsWith('/admin') && role !== 'admin') return '/dashboard'
    return redirect
  }
  return role === 'admin' ? '/admin' : '/dashboard'
}

onMounted(() => {
  if (user.value) {
    router.replace(getPostLoginTarget(user.value.role))
  }
})

async function handleLoginSubmit(customEmail?: string, customPassword?: string) {
  errorMessage.value = ''
  const email = (customEmail ?? loginForm.email).trim()
  const password = customPassword ?? loginForm.password

  if (!email || !password) {
    errorMessage.value = 'Mohon isi email dan kata sandi.'
    return
  }

  isSubmitting.value = true
  try {
    const loggedInUser = await login(email, password)
    if (!loggedInUser) throw new Error('Gagal masuk.')

    toast.push(`Selamat datang, ${loggedInUser.name}!`, {
      description: loggedInUser.role === 'admin'
        ? 'Anda masuk sebagai Admin Butik.'
        : 'Anda masuk sebagai Penyewa.',
      type: 'success',
    })

    await router.push(getPostLoginTarget(loggedInUser.role))
  }
  catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    errorMessage.value
      = fetchErr?.data?.statusMessage
        || fetchErr?.statusMessage
        || fetchErr?.message
        || 'Email atau kata sandi salah.'
  }
  finally {
    isSubmitting.value = false
  }
}

async function handleAdminLoginSubmit() {
  errorMessage.value = ''
  const username = adminForm.username.trim()
  const password = adminForm.password.trim()
  if (!username || !password) {
    errorMessage.value = 'Mohon masukkan username dan kata sandi admin.'
    return
  }

  isSubmitting.value = true
  try {
    const loggedInUser = await login(username, password, 'admin')
    if (!loggedInUser) throw new Error('Gagal masuk.')

    toast.push(`Selamat datang, ${loggedInUser.name}!`, {
      description: 'Anda masuk ke Panel Admin Seruni Atelier.',
      type: 'success',
    })

    await router.push('/admin')
  }
  catch {
    errorMessage.value = 'Username atau kata sandi admin salah. Akses ini khusus untuk Admin Butik.'
  }
  finally {
    isSubmitting.value = false
  }
}

async function handleRegisterSubmit() {
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    const created = await register({
      name: registerForm.name.trim(),
      email: registerForm.email.trim(),
      phone: registerForm.phone.trim(),
      password: registerForm.password,
    })
    if (!created) throw new Error('Gagal mendaftar.')

    toast.push('Akun Penyewa Berhasil Dibuat!', {
      description: `Selamat bergabung, ${created.name}.`,
      type: 'success',
    })

    await router.push(getPostLoginTarget('user'))
  }
  catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
    errorMessage.value
      = fetchErr?.data?.statusMessage
        || fetchErr?.statusMessage
        || fetchErr?.message
        || 'Gagal membuat akun baru.'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
    <div class="grid grid-cols-1 overflow-hidden rounded-3xl border border-[#E8E3DC] bg-white shadow-sm md:grid-cols-12">
      <!-- Left Editorial Visual Panel -->
      <div class="relative hidden bg-[#EAE5DE] md:col-span-5 md:flex md:flex-col md:justify-between">
        <div class="p-8">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-[#556256]">
            <Sparkles class="h-3.5 w-3.5" />
            Seruni Atelier Access
          </span>
          <h1 class="mt-4 font-serif text-3xl leading-tight text-[#2B2A28]">
            Tampil Anggun,<br>
            <span class="font-script text-4xl">Praktis</span> Setiap Acara
          </h1>
          <p class="mt-3 text-xs leading-relaxed text-[#6B655E]">
            Masuk atau daftar akun <strong>Penyewa</strong> untuk booking kebaya, dress sopan, jas pria, dan sepatu pesta, serta pantau status penyewaan &amp; pengembalian deposit Anda.
          </p>
        </div>

        <div class="h-72 w-full overflow-hidden">
          <img
            src="/images/kebaya-burgundy-couture.jpg"
            alt="Seruni Atelier"
            class="h-full w-full object-cover object-top"
          >
        </div>
      </div>

      <!-- Right Auth Form Panel -->
      <div class="p-6 sm:p-8 md:col-span-7 lg:p-10">
        <!-- Mode Switcher -->
        <div class="flex flex-wrap gap-5 border-b border-[#EFECE7] sm:gap-6">
          <button
            type="button"
            class="border-b-2 pb-3 text-sm font-medium transition-colors"
            :class="mode === 'login' ? 'border-[#2B2A28] text-[#2B2A28]' : 'border-transparent text-[#8A837A] hover:text-[#2B2A28]'"
            @click="mode = 'login'; errorMessage = ''"
          >
            Masuk Pelanggan
          </button>
          <button
            type="button"
            class="border-b-2 pb-3 text-sm font-medium transition-colors"
            :class="mode === 'register' ? 'border-[#2B2A28] text-[#2B2A28]' : 'border-transparent text-[#8A837A] hover:text-[#2B2A28]'"
            @click="mode = 'register'; errorMessage = ''"
          >
            Daftar Baru
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors"
            :class="mode === 'admin' ? 'border-[#556256] text-[#556256]' : 'border-transparent text-[#8A837A] hover:text-[#556256]'"
            @click="mode = 'admin'; errorMessage = ''"
          >
            <ShieldCheck class="h-4 w-4" />
            Admin
          </button>
        </div>

        <!-- Login Form -->
        <form v-if="mode === 'login'" class="mt-6 space-y-4" @submit.prevent="handleLoginSubmit()">
          <div>
            <label for="login-email" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
              Email
            </label>
            <input
              id="login-email"
              v-model="loginForm.email"
              type="email"
              required
              placeholder="nama@email.com"
              class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
            >
          </div>

          <div>
            <label for="login-password" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
              Kata Sandi
            </label>
            <input
              id="login-password"
              v-model="loginForm.password"
              type="password"
              required
              placeholder="Masukkan kata sandi"
              class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
            >
          </div>

          <p
            v-if="errorMessage"
            class="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700"
          >
            {{ errorMessage }}
          </p>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2B2A28] px-5 py-3 text-xs font-medium tracking-wide text-white transition-all hover:bg-[#3F3D39] disabled:opacity-60"
          >
            <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
            <span>{{ isSubmitting ? 'Memverifikasi...' : 'Masuk Sekarang' }}</span>
            <ArrowRight v-if="!isSubmitting" class="h-3.5 w-3.5" />
          </button>
        </form>

        <!-- Register Form -->
        <form v-else-if="mode === 'register'" class="mt-6 space-y-4" @submit.prevent="handleRegisterSubmit">
          <div>
            <label for="reg-name" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
              Nama Lengkap
            </label>
            <input
              id="reg-name"
              v-model="registerForm.name"
              type="text"
              required
              placeholder="Contoh: Nabila Azzahra"
              class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
            >
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="reg-email" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
                Email
              </label>
              <input
                id="reg-email"
                v-model="registerForm.email"
                type="email"
                required
                placeholder="nabila@email.com"
                class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
              >
            </div>
            <div>
              <label for="reg-phone" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
                No. WhatsApp
              </label>
              <input
                id="reg-phone"
                v-model="registerForm.phone"
                type="tel"
                required
                placeholder="0812-xxxx-xxxx"
                class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
              >
            </div>
          </div>

          <div>
            <label for="reg-password" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
              Kata Sandi <span class="normal-case text-[#A39C93]">(min. 6 karakter)</span>
            </label>
            <input
              id="reg-password"
              v-model="registerForm.password"
              type="password"
              minlength="6"
              required
              placeholder="Buat kata sandi"
              class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
            >
          </div>

          <p
            v-if="errorMessage"
            class="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700"
          >
            {{ errorMessage }}
          </p>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2B2A28] px-5 py-3 text-xs font-medium tracking-wide text-white transition-all hover:bg-[#3F3D39] disabled:opacity-60"
          >
            <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
            <span>{{ isSubmitting ? 'Mendaftarkan...' : 'Buat Akun Pelanggan' }}</span>
          </button>
        </form>

        <!-- Admin Secret Login Form -->
        <form v-else class="mt-6 space-y-4" @submit.prevent="handleAdminLoginSubmit">
          <div class="rounded-xl border border-[#D7E0D5] bg-[#F4F7F3] p-3.5 text-xs text-[#4A574B]">
            <div class="flex items-center gap-2 font-semibold text-[#2B2A28]">
              <Lock class="h-3.5 w-3.5 text-[#556256]" />
              Akses Khusus Admin Butik
            </div>
            <p class="mt-1 text-[11px] leading-relaxed text-[#5C685D]">
              Masukkan username dan kata sandi rahasia admin untuk mengelola katalog, pesanan masuk, dan pengembalian deposit.
            </p>
          </div>

          <div>
            <label for="admin-username" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
              Username Admin
            </label>
            <input
              id="admin-username"
              v-model="adminForm.username"
              type="text"
              required
              autocomplete="username"
              placeholder="Masukkan username admin"
              class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
            >
          </div>

          <div>
            <label for="admin-password" class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#6B655E]">
              Kata Sandi Admin
            </label>
            <input
              id="admin-password"
              v-model="adminForm.password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="Masukkan kata sandi admin"
              class="w-full rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#2B2A28] focus:border-[#556256] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#556256]"
            >
          </div>

          <p
            v-if="errorMessage"
            class="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700"
          >
            {{ errorMessage }}
          </p>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#556256] px-5 py-3 text-xs font-medium tracking-wide text-white transition-all hover:bg-[#455146] disabled:opacity-60"
          >
            <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
            <ShieldCheck v-else class="h-4 w-4" />
            <span>{{ isSubmitting ? 'Memverifikasi...' : 'Masuk Panel Admin' }}</span>
          </button>
        </form>

        <div class="mt-6 border-t border-[#EFECE7] pt-5 text-center text-xs text-[#8A837A]">
          <template v-if="mode === 'login'">
            Belum punya akun pelanggan?
            <button
              type="button"
              class="font-semibold text-[#556256] underline-offset-2 hover:underline"
              @click="mode = 'register'; errorMessage = ''"
            >
              Daftar sekarang
            </button>
          </template>
          <template v-else-if="mode === 'register'">
            Sudah memiliki akun?
            <button
              type="button"
              class="font-semibold text-[#556256] underline-offset-2 hover:underline"
              @click="mode = 'login'; errorMessage = ''"
            >
              Masuk di sini
            </button>
          </template>
          <template v-else>
            Ingin menyewa busana sebagai pelanggan?
            <button
              type="button"
              class="font-semibold text-[#556256] underline-offset-2 hover:underline"
              @click="mode = 'login'; errorMessage = ''"
            >
              Masuk / Daftar Pelanggan
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
