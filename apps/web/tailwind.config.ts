import type { Config } from 'tailwindcss';

/**
 * Design tokens from spec 02 §4. Status is never communicated by color
 * alone — components pair every color with a label, icon, or pattern.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#050505',
        cream: '#FFF4D8',
        brand: {
          blue: '#304BFF',
          cyan: '#00D9FF',
          purple: '#6D35FF',
        },
        status: {
          green: '#00C878',
          lime: '#B7FF00',
          orange: '#FF6A00',
          red: '#F2382A',
        },
        surface: {
          DEFAULT: '#0C0C10',
          raised: '#14141A',
          overlay: '#1C1C24',
          line: '#2A2A34',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
