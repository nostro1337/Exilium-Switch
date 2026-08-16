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
        mono: {
          950: '#050505',
          900: '#0a0a0a',
          850: '#111111',
          800: '#171717',
          750: '#1f1f1f',
          700: '#262626',
          600: '#383838',
          500: '#525252',
          400: '#737373',
          300: '#a3a3a3',
          200: '#d4d4d4',
          100: '#f5f5f5',
          50: '#ffffff'
        }
      },
      fontFamily: {
        sans: ['"Segoe UI Variable Display"', '"Segoe UI"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Code"', '"Consolas"', '"Courier New"', 'monospace']
      },
      boxShadow: {
        'mono-glow': '0 0 35px rgba(255, 255, 255, 0.25)',
        'mono-card': '0 4px 20px rgba(0, 0, 0, 0.6)',
        'mono-switch-on': '0 0 35px rgba(255, 255, 255, 0.35), inset 0 0 15px rgba(255, 255, 255, 0.15)',
        'mono-switch-off': '0 8px 24px rgba(0, 0, 0, 0.8), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
      }
    },
  },
  plugins: [],
}
