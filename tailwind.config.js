import colors from 'tailwindcss/colors';

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const scale = (name) =>
  Object.fromEntries(shades.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: scale('brand'),
        accent: scale('accent'),
        ink: colors.slate,
      },
      fontFamily: {
        // Swap the Google Fonts link in build/site-settings-plugin.ts and these names together.
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shine: {
          '0%': { transform: 'translateX(-120%) skewX(-20deg)' },
          '60%, 100%': { transform: 'translateX(220%) skewX(-20deg)' },
        },
      },
      animation: {
        shine: 'shine 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
