/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bg: {
          primary: '#070B1A',
          secondary: '#0D1326',
          card: '#111827',
        },
        violet: {
          DEFAULT: '#7C5CFF',
          light: '#9B7FFF',
          dark: '#5A3FD6',
        },
        cyan: {
          DEFAULT: '#22D3EE',
          light: '#67E8F9',
          dark: '#0891B2',
        },
        pink: {
          DEFAULT: '#F472B6',
          light: '#F9A8D4',
          dark: '#DB2777',
        },
        amber: {
          DEFAULT: '#F59E0B',
          light: '#FCD34D',
          dark: '#D97706',
        },
      },
      backgroundImage: {
        'gradient-violet-cyan': 'linear-gradient(135deg, #7C5CFF, #22D3EE)',
        'gradient-violet-pink': 'linear-gradient(135deg, #7C5CFF, #F472B6)',
        'gradient-cyber': 'linear-gradient(135deg, #070B1A 0%, #0D1326 50%, #070B1A 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
