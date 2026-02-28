/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' },
        saffron: { 500: '#f97316', 600: '#ea580c' },
        gov: { green: '#138808', blue: '#000080', saffron: '#FF9933' }
      }
    }
  },
  plugins: []
}
