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
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        slate: {
          950: '#020617', // Deepest background
          900: '#0f172a', // Deep background
          800: '#1e293b', // Card background
          700: '#334155', // Borders
          400: '#94a3b8', // Muted text
        },
        purple: {
          500: '#8b5cf6', // Primary Action (Violet)
          600: '#7c3aed',
          900: '#4c1d95',
        },
        rose: {
          500: '#f43f5e', // Risk/Control -> Now Accent
          600: '#e11d48', // Strong Accent
          900: '#881337',
        },
        fuchsia: {
          500: '#d946ef', // Highlight
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slow-pan': 'pan 20s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pan: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'magma-grid': 'linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
      },
      boxShadow: {
        'glass': '0 0 20px rgba(0, 0, 0, 0.1) inset',
        'surface': '0 1px 0 rgba(255, 255, 255, 0.1) inset',
        'purple-glow': '0 0 15px rgba(124, 58, 237, 0.5)',
        'rose-glow': '0 0 15px rgba(225, 29, 72, 0.5)',
      },
    },
  },
  plugins: [],
}
export default config

