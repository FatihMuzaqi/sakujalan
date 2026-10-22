/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcddff',
          300: '#8ec7ff',
          400: '#59a7ff',
          500: '#3282f6',
          600: '#1d64ea',
          700: '#154ecc',
          800: '#1740a6',
          900: '#183882',
          DEFAULT: '#1d64ea',
        },
        sidebar: {
          bg: '#0f172a',
          hover: '#1e293b',
          active: '#334155',
          text: '#94a3b8',
          textActive: '#ffffff'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
