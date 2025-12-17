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
        neon: {
          purple: '#8b5cf6',
          'purple-light': '#a855f7',
          pink: '#ec4899',
          'pink-light': '#f472b6',
          cyan: '#06b6d4',
          'cyan-light': '#22d3ee',
          blue: '#3b82f6',
          'blue-light': '#60a5fa',
          orange: '#f97316',
          'orange-light': '#fb923c',
          yellow: '#eab308',
          'yellow-light': '#facc15',
          magenta: '#d946ef',
          'magenta-light': '#e879f9',
        },
        dark: {
          bg: '#0a0a0a',
          'bg-secondary': '#111827',
          'bg-tertiary': '#1f2937',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { opacity: '0.5', transform: 'scale(1)' },
          '100%': { opacity: '1', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'neon-purple': '0 0 10px rgba(139, 92, 246, 0.6), 0 0 20px rgba(139, 92, 246, 0.4), 0 0 30px rgba(139, 92, 246, 0.3), 0 0 40px rgba(236, 72, 153, 0.2)',
        'neon-cyan': '0 0 10px rgba(6, 182, 212, 0.6), 0 0 20px rgba(6, 182, 212, 0.4), 0 0 30px rgba(6, 182, 212, 0.3), 0 0 40px rgba(217, 70, 239, 0.2)',
        'neon-pink': '0 0 10px rgba(236, 72, 153, 0.6), 0 0 20px rgba(236, 72, 153, 0.4), 0 0 30px rgba(236, 72, 153, 0.3), 0 0 40px rgba(139, 92, 246, 0.2)',
        'neon-rainbow': '0 0 10px rgba(139, 92, 246, 0.5), 0 0 20px rgba(236, 72, 153, 0.4), 0 0 30px rgba(6, 182, 212, 0.3), 0 0 40px rgba(217, 70, 239, 0.2), 0 0 50px rgba(249, 115, 22, 0.1)',
      },
    },
  },
  plugins: [],
}
export default config

