import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // CSS variables'a bağlı — Tailwind arbitrary values ile kullanılır
        // Örn: bg-[var(--bg-surface)]
      },
      fontFamily: {
        display: ['Instrument Serif', 'Georgia', 'serif'],
        body: ['Inter', '-apple-system', 'sans-serif'],
      },
      screens: {
        xs: '475px',
      },
    },
  },
  plugins: [],
}

export default config