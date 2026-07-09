/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Industrial / shop-floor palette — legible in bright shop light and on a tablet outdoors.
        steel: {
          950: '#12161c',
          900: '#1b2129',
          800: '#262e38',
          700: '#374252',
          600: '#4b5a6e',
          400: '#8695a8',
          200: '#d7dde4',
          50:  '#f5f7f9',
        },
        signal: '#e0672a',   // safety-orange accent — used sparingly, for primary actions & alerts
        go: '#3f8f5f',       // stage-complete green
        wait: '#c9a227',     // pending / waiting-on-payment amber
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
