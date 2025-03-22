/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      opacity: {
        '70': '0.7',
        '80': '0.8',
      },
    },
  },
  plugins: [],
}