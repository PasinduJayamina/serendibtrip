/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#208896',
          50: '#e6f4f5',
          100: '#cce9ec',
          200: '#99d3d9',
          300: '#66bdc6',
          400: '#33a7b3',
          500: '#208896',
          600: '#1a6f7a',
          700: '#14555e',
          800: '#0e3c42',
          900: '#072226',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
