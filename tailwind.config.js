/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#030712',
          900: '#060e24',
          850: '#0a163a',
          800: '#0f2252',
          750: '#142c69',
          700: '#1b3a88',
          600: '#254fa8',
          500: '#3369d6',
          400: '#5c8df5',
          300: '#93b4fa',
          200: '#c5d7fc',
          100: '#e8f0fe',
        },
        blure: {
          cyan: '#00f5d4',
          sky: '#38bdf8',
          electric: '#0284c7',
          indigo: '#6366f1',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          violet: '#8b5cf6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 245, 212, 0.35)',
        'glow-sky': '0 0 25px -5px rgba(56, 189, 248, 0.4)',
        'glow-navy': '0 10px 30px -10px rgba(15, 34, 82, 0.7)',
        'glass-card': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar': 'radar 2s linear infinite',
      },
      keyframes: {
        radar: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
