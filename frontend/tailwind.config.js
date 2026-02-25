/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    screens: {
      'xs': '320px',
      'sm': '480px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1440px',
    },
    extend: {
      colors: {
        // Warm Gold - Primary (inspired by temple gold & tropical sun)
        primary: {
          50: '#FDF8F0',
          100: '#FAF1E1',
          200: '#F4DFBD',
          300: '#EDCE99',
          400: '#E6BC75',
          500: '#E8A838', // Brand Warm
          600: '#C78822',
          700: '#996614',
          800: '#66420A',
          900: '#332003',
        },
        // Deep Ocean - Secondary (deep water, primary text contrast)
        secondary: {
          50: '#F0F3F5',
          100: '#E1E8EC',
          200: '#C3D0D8',
          300: '#A1B7C2',
          400: '#698B9D',
          500: '#1B3A4B', // Brand Deep
          600: '#142C39',
          700: '#0E1F28',
          800: '#081217',
          900: '#030608',
        },
        // Terracotta - Accent (clay, spices, sunsets)
        accent: {
          50: '#FDF1EE',
          100: '#FBE3DE',
          200: '#F6C7BC',
          300: '#F1ABAD',
          400: '#E87D6B',
          500: '#D4553A', // Brand Accent
          600: '#B03F27',
          700: '#872D1A',
          800: '#5C1C0F',
          900: '#330D05',
        },
        // Warm Sand - Neutral backgrounds
        sand: {
          50: '#FDFBF7', // Surface 0
          100: '#F5F1EB', // Surface 2
          200: '#EBE2D5',
          300: '#DCCBBA',
          400: '#CDB49E',
          500: '#BF9E82',
          600: '#997D65',
          700: '#735C4A',
          800: '#4D3B2E',
          900: '#261C16',
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
