/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        surface: '#111111',
        border: '#2A2A2A',
        accent: '#7C3AED',
      }
    }
  },
  plugins: []
}
