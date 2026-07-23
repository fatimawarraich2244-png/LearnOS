/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        bg: '#051F20',
        surface: '#0B2B26',
        surface2: '#163832',
        border: '#235347',
        'accent-green': '#8EB69B',
        'accent-teal': '#A8D4DC',
        'accent-purple': '#959BB9',
        'text-primary': '#DAF1DE',
        'text-secondary': '#8EB69B',
        'text-muted': '#235347',
      },
    },
  },
  plugins: [],
}
