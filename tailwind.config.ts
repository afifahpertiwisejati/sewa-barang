import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
    './app/error.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        script: ['"Alex Brush"', 'cursive'],
      },
      colors: {
        ivory: '#FAF8F5',
        linen: '#EAE5DE',
        sand: '#EFECE7',
        blush: '#DEC7BF',
        taupe: '#D9D2C8',
        charcoal: '#2B2A28',
        sage: {
          50: '#F3F5F2',
          100: '#E3E8E2',
          200: '#C7D1C5',
          400: '#8A9A87',
          500: '#6F7F6C',
          600: '#556256',
          700: '#455146',
          800: '#384239',
        },
      },
    },
  },
  plugins: [],
}
