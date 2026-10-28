import type { Config } from 'tailwindcss';

/**
 * Design system tuned for a premium real-estate CRM:
 * - Stone neutrals (warmer than slate) for a calmer, less "techy" feel.
 * - One brand accent (teal) used very sparingly on primary CTAs + active states.
 * - Dense typography with mono numerals for money/IDs.
 * - Borders carry hierarchy; shadows are barely-there.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
        xs:    ['12px', { lineHeight: '16px' }],
        sm:    ['13px', { lineHeight: '18px' }],
        base:  ['14px', { lineHeight: '20px' }],
        md:    ['15px', { lineHeight: '22px' }],
        lg:    ['16px', { lineHeight: '24px' }],
        xl:    ['18px', { lineHeight: '26px' }],
        '2xl': ['22px', { lineHeight: '30px' }],
        '3xl': ['28px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
        '5xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em' }],
      },
      colors: {
        ink: {
          50:  '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
        brand: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        success: { 50: '#f0fdf4', 100: '#dcfce7', 600: '#16a34a', 700: '#15803d' },
        warn:    { 50: '#fefce8', 100: '#fef9c3', 600: '#ca8a04', 700: '#a16207' },
        danger:  { 50: '#fef2f2', 100: '#fee2e2', 600: '#dc2626', 700: '#b91c1c' },
        info:    { 50: '#f0f9ff', 100: '#e0f2fe', 600: '#0284c7', 700: '#0369a1' },
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        card:    '0 0 0 1px rgb(0 0 0 / 0.04)',
        elevate: '0 4px 12px -2px rgb(0 0 0 / 0.06), 0 0 0 1px rgb(0 0 0 / 0.04)',
        focus:   '0 0 0 3px rgb(13 148 136 / 0.18)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
