const defaultTheme = require('tailwindcss/defaultTheme');
const typography = require('@tailwindcss/typography');
const containerQueries = require('@tailwindcss/container-queries');
const tailwindcssAnimate = require('tailwindcss-animate');

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: 'selector',
  content: ['./src/**/*.{html,js,svelte,ts}'],
  safelist: [
    'dark',
    'grid-cols-1',
    'grid-cols-2',
    'grid-cols-3',
    'grid-cols-4',
    'grid-cols-5',
    'grid-cols-6',
    'grid-cols-7',
    'grid-cols-8',
    'grid-cols-9',
    'grid-cols-10',
    'grid-cols-11',
    'grid-cols-12',
    'lg:grid-cols-1',
    'lg:grid-cols-2',
    'lg:grid-cols-3',
    'lg:grid-cols-4',
    'lg:grid-cols-5',
    'lg:grid-cols-6',
    'lg:grid-cols-7',
    'lg:grid-cols-8',
    'lg:grid-cols-9',
    'lg:grid-cols-10',
    'lg:grid-cols-11',
    'lg:grid-cols-12',
    'col-span-1',
    'col-span-2',
    'col-span-3',
    'col-span-4',
    'col-span-5',
    'col-span-6',
    'col-span-7',
    'col-span-8',
    'col-span-9',
    'col-span-10',
    'col-span-11',
    'col-span-12',
    'lg:col-span-1',
    'lg:col-span-2',
    'lg:col-span-3',
    'lg:col-span-4',
    'lg:col-span-5',
    'lg:col-span-6',
    'lg:col-span-7',
    'lg:col-span-8',
    'lg:col-span-9',
    'lg:col-span-10',
    'lg:col-span-11',
    'lg:col-span-12',
    'row-span-1',
    'lg:row-span-1',
    'row-span-2',
    'lg:row-span-2'
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem'
    },
    extend: {
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        fade: 'fadeIn .25s ease-in-out',
        progress: 'progress 2s infinite linear'
      },
      containers: {
        default: '0rem'
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 }
        },
        progress: {
          '0%': { transform: 'translateX(0) scaleX(0)' },
          '25%': { transform: 'translateX(0) scaleX(0.2)' },
          '50%': { transform: 'translateX(0) scaleX(0.4)' },
          '75%': { transform: 'translateX(50%) scaleX(0.5)' },
          '100%': { transform: 'translateX(100%) scaleX(0.5)' }
        }
      },
      transformOrigin: {
        'left-right': '0% 50%'
      },
      colors: {
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        light: {
          foreground: 'hsl(var(--light-foreground) / <alpha-value>)'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
          background: 'hsl(var(--primary-background) / <alpha-value>)'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
          background: 'hsl(var(--destructive-background) / <alpha-value>)'
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          foreground: 'hsl(var(--success-foreground) / <alpha-value>)',
          background: 'hsl(var(--success-background) / <alpha-value>)'
        },
        link: {
          DEFAULT: 'hsl(var(--link))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
          background: 'hsl(var(--muted-background) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
        },
        category: {
          1: {
            DEFAULT: 'hsl(var(--category-1) / <alpha-value>)',
            foreground: 'hsl(var(--category-1-foreground) / <alpha-value>)',
            background: 'hsl(var(--category-1-background) / <alpha-value>)'
          },
          2: {
            DEFAULT: 'hsl(var(--category-2) / <alpha-value>)',
            foreground: 'hsl(var(--category-2-foreground) / <alpha-value>)',
            background: 'hsl(var(--category-2-background) / <alpha-value>)'
          },
          3: {
            DEFAULT: 'hsl(var(--category-3) / <alpha-value>)',
            foreground: 'hsl(var(--category-3-foreground) / <alpha-value>)',
            background: 'hsl(var(--category-3-background) / <alpha-value>)'
          },
          4: {
            DEFAULT: 'hsl(var(--category-4) / <alpha-value>)',
            foreground: 'hsl(var(--category-4-foreground) / <alpha-value>)',
            background: 'hsl(var(--category-4-background) / <alpha-value>)'
          },
          5: {
            DEFAULT: 'hsl(var(--category-5) / <alpha-value>)',
            foreground: 'hsl(var(--category-5-foreground) / <alpha-value>)',
            background: 'hsl(var(--category-5-background) / <alpha-value>)'
          },
          6: {
            DEFAULT: 'hsl(var(--category-6) / <alpha-value>)',
            foreground: 'hsl(var(--category-6-foreground) / <alpha-value>)',
            background: 'hsl(var(--category-6-background) / <alpha-value>)'
          }
        }
      },
      borderRadius: {
        sm: 'calc(var(--radius) / 2)',
        default: 'var(--radius)',
        md: 'var(--radius)',
        lg: 'calc(var(--radius) * 2 + 2px)',
        xl: 'calc(var(--radius) * 4)',
        '2xl': 'calc(var(--radius) * 5)'
      },
      fontFamily: {
        sans: ['ABC Monument Grotesk', ...defaultTheme.fontFamily.sans],
        mono: ['ABC Monument Grotesk Mono', ...defaultTheme.fontFamily.mono],
        serif: ['linotype-sabon', ...defaultTheme.fontFamily.serif]
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--bits-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--bits-accordion-content-height)' },
          to: { height: '0' }
        },
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%': { opacity: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'caret-blink': 'caret-blink 1.25s ease-out infinite'
      }
    }
  },
  plugins: [typography, containerQueries, tailwindcssAnimate]
};

module.exports = config;
