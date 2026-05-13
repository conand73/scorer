/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f0f1a',
          light: '#1a1a2e',
          lighter: '#252540',
          card: '#16162a',
        },
        player: {
          a: '#2563eb',
          'a-bright': '#3b82f6',
          b: '#dc2626',
          'b-bright': '#ef4444',
        },
        accent: '#10b981',
      },
      fontSize: {
        score: ['8rem', { lineHeight: '1', fontWeight: '700' }],
        'score-lg': ['10rem', { lineHeight: '1', fontWeight: '700' }],
        'score-blind': ['14vw', { lineHeight: '1', fontWeight: '800' }],
      },
      touchAction: {
        none: 'none',
      },
    },
  },
  plugins: [],
};
