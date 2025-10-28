/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          900: '#4C1D95',
        },
      },
    },
  },
  plugins: [],
}
