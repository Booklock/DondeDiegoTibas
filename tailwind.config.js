/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#991b1b',
          700: '#7f1d1d',
          800: '#5a1010',
          900: '#3d0a0a',
          950: '#1e0505',
        },
      },
    },
  },
  plugins: [],
}
