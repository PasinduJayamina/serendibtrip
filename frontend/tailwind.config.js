/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ceylon Gold - Primary (inspired by temple gold & spices)
        primary: {
          DEFAULT: '#D4A853',
          50: '#FCF8EF',
          100: '#F7EDDA',
          200: '#EDD9B5',
          300: '#E3C590',
          400: '#D9B16B',
          500: '#D4A853',
          600: '#B8893A',
          700: '#8C682C',
          800: '#60471E',
          900: '#342610',
        },
        // Tropical Green - Secondary (tea plantations, jungles)
        secondary: {
          DEFAULT: '#2D6A4F',
          50: '#E8F3EE',
          100: '#D1E7DD',
          200: '#A3CFBB',
          300: '#75B799',
          400: '#479F77',
          500: '#2D6A4F',
          600: '#245540',
          700: '#1B4030',
          800: '#122B20',
          900: '#091610',
        },
        // Ocean Blue - Accent (beaches, coastal waters)
        accent: {
          DEFAULT: '#1E88A8',
          50: '#E6F4F7',
          100: '#CCE9EF',
          200: '#99D3DF',
          300: '#66BDCF',
          400: '#33A7BF',
          500: '#1E88A8',
          600: '#186D87',
          700: '#125265',
          800: '#0C3744',
          900: '#061B22',
        },
        // Warm Sand - Neutral (ancient cities, beaches)
        sand: {
          DEFAULT: '#F5E6D3',
          50: '#FDFAF6',
          100: '#FAF5ED',
          200: '#F5E6D3',
          300: '#E8D4BA',
          400: '#DBC2A1',
          500: '#CEB088',
          600: '#B89A6F',
          700: '#8F7556',
          800: '#66503D',
          900: '#3D2B24',
        },
        // Terracotta - Warning/Earth tones
        terracotta: {
          DEFAULT: '#C75B39',
          50: '#FCF0EC',
          100: '#F9E1D9',
          200: '#F3C3B3',
          300: '#EDA58D',
          400: '#E78767',
          500: '#C75B39',
          600: '#9F492E',
          700: '#773722',
          800: '#4F2517',
          900: '#27130B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'bounce-subtle': 'bounceSubtle 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      boxShadow: {
        'glow-gold': '0 0 20px rgba(212, 168, 83, 0.3)',
        'glow-green': '0 0 20px rgba(45, 106, 79, 0.3)',
      },
      backgroundImage: {
        'ceylon-gradient': 'linear-gradient(135deg, #2D6A4F 0%, #1E88A8 50%, #D4A853 100%)',
        'tropical-gradient': 'linear-gradient(to right, #2D6A4F, #3D8B6D)',
        'golden-gradient': 'linear-gradient(135deg, #D4A853, #E8C574)',
        'ocean-gradient': 'linear-gradient(to bottom, #1E88A8, #166B87)',
      },
    },
  },
  plugins: [],
};
