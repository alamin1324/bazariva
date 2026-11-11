/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        royal: '#0755C9',
        navy: '#062B75',
        brandorange: '#FF6A00',
        lightbg: '#F5F8FF',
      },
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
