/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      transitionDuration: {
        250: '250ms',
      },
      colors: {
        smoke: '#EEEEEE',
        silver: '#CCCCCC',
        'mid-gray': '#999999',
        charcoal: '#666666',
        black: '#111111',
        caramel: '#A67B5B',
        'caramel-dark': '#7A5A40',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Lora', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
