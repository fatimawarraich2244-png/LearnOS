/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['DM Sans', 'Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        inter: ['DM Sans', 'sans-serif'],
      },
      colors: {
        bg: '#0A1F1D',
        surface: '#0F2E2A',
        border: '#1B3A35',
        'teal-accent': '#00AFB9',
        'gold-accent': '#FED9B7',
        'text-primary': '#EDEDE3',
        'text-muted': '#8FA69E',
      },
    },
  },
  plugins: [],
}
