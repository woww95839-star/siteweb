import type { Config } from 'tailwindcss';
const rtl = require('tailwindcss-rtl');

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui'],
        arabic: ['var(--font-noto-arabic)', 'ui-sans-serif', 'system-ui'],
        display: ['var(--font-inter)', 'ui-sans-serif'],
      },
      colors: {
        // Palette SokPlus
        brand: {
          50:  '#eef4fb',
          100: '#d9e7f5',
          200: '#b3ceeb',
          300: '#7fabda',
          400: '#4d88c7',
          500: '#2d6bb3',
          600: '#1e3a5f', // Primary brand
          700: '#17305a',
          800: '#122650',
          900: '#0d1d40',
          950: '#080f26',
        },
        teal: {
          50:  '#f0fdfb',
          100: '#ccfbf4',
          200: '#99f6e9',
          300: '#5eead4',
          400: '#2dd4be',
          500: '#14b8a6',
          600: '#0d9488', // Success
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        warning: {
          50:  '#fff7ed',
          100: '#ffedd5',
          400: '#fb923c',
          500: '#f97316', // Orange alerts
          600: '#ea580c',
        },
        surface: {
          0:   'var(--surface-0)',
          50:  'var(--surface-50)',
          100: 'var(--surface-100)',
          200: 'var(--surface-200)',
          300: 'var(--surface-300)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          inverse:   'var(--text-inverse)',
        },
        border: 'var(--border)',
      },
      borderRadius: {
        card:   '12px',
        btn:    '8px',
        input:  '8px',
        badge:  '6px',
        full:   '9999px',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05)',
        'card-hover': '0 4px 12px rgba(0,0,0,.12)',
        btn:   '0 1px 2px rgba(0,0,0,.08)',
        modal: '0 20px 60px rgba(0,0,0,.18)',
      },
      spacing: {
        sidebar: '260px',
        'sidebar-sm': '72px',
        header: '64px',
      },
      animation: {
        'fade-in':     'fadeIn .3s ease forwards',
        'slide-up':    'slideUp .35s cubic-bezier(.4,0,.2,1) forwards',
        'slide-in-r':  'slideInRight .3s cubic-bezier(.4,0,.2,1) forwards',
        'slide-in-l':  'slideInLeft .3s cubic-bezier(.4,0,.2,1) forwards',
        'pulse-ring':  'pulseRing 1.5s ease-in-out infinite',
        'shimmer':     'shimmer 1.8s linear infinite',
        'bounce-dot':  'bounceDot .8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        pulseRing: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '.6', transform: 'scale(1.12)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition: '200% 0' },
        },
        bounceDot: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [rtl],
};

export default config;
