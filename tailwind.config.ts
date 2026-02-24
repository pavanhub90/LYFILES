import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#07080d',
        bg2: '#0d0f18',
        bg3: '#12141f',
        surface: '#181a28',
        surface2: '#1e2030',
        cyan: { DEFAULT: '#00e5cc', dim: 'rgba(0,229,204,0.12)', glow: 'rgba(0,229,204,0.3)' },
        violet: { DEFAULT: '#7b61ff', dim: 'rgba(123,97,255,0.12)' },
        brand: '#00e5cc',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
