export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  devServer: {
    host: '::',
    port: 3000,
  },

  vite: {
    optimizeDeps: {
      include: ['lucide-vue-next'],
    },
  },

  runtimeConfig: {
    tidbHost: process.env.TIDB_HOST || '',
    tidbPort: Number(process.env.TIDB_PORT || 4000),
    tidbUser: process.env.TIDB_USER || '',
    tidbPassword: process.env.TIDB_PASSWORD || '',
    tidbDatabase: process.env.TIDB_DATABASE || 'sewain_db',
    tidbCaPath: process.env.TIDB_CA_PATH || '',
    sessionSecret: process.env.SEWAIN_SESSION_SECRET || 'sewain-boutique-secret-key-2026',
    public: {
      whatsappNumber: process.env.NUXT_PUBLIC_WHATSAPP_NUMBER || '6281234567890',
    },
  },

  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
  },

  app: {
    head: {
      title: 'Seruni Atelier — Sewa Kebaya, Dress Sopan, Jas Pria & Sepatu Pesta',
      htmlAttrs: {
        lang: 'id',
        translate: 'no',
        class: 'notranslate',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'google', content: 'notranslate' },
        {
          name: 'description',
          content:
            'Sewa kebaya modern, gaun pesta, kebaya lamaran, hingga dress bridesmaid terkurasi dari pemilik terverifikasi di seluruh Indonesia. Sudah termasuk laundry dry-clean.',
        },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..600&family=Playfair+Display:ital,wght@0,400..700;1,400..600&display=swap',
        },
      ],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})
