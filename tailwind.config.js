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
        node: {
          bg: '#18181b',
          border: '#27272a',
          header: '#27272a',
          accent: '#3b82f6',
        }
      }
    },
  },
  plugins: [],
}
