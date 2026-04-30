/** @type {import('tailwindcss').Config} */
// Tokens sourced from the Paycrest Component Library Figma file.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Google Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        gray: {
          50: '#F7F7F8',
          100: '#EBEBEF',
          200: '#D1D1DB',
          300: '#A9A9BC',
          400: '#8A8AA3',
          500: '#6C6C89',
          600: '#55556D',
          700: '#3F3F50',
          800: '#282833',
          900: '#121217',
        },
        royal: {
          50: '#E5F0FE',
          100: '#CCE0FD',
          200: '#99C1FB',
          300: '#66A2F9',
          400: '#3384F7',
          500: '#0065F5',
          600: '#0051C4',
          700: '#003D93',
          800: '#002862',
          900: '#001E49',
        },
        danger: {
          50: '#FEF0F4',
          100: '#FDD8E1',
          200: '#FBB1C4',
          300: '#F98BA6',
          400: '#F76489',
          500: '#F53D6B',
          600: '#F3164E',
          700: '#D50B3E',
          800: '#AF0932',
          900: '#880727',
        },
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        'x-md': '12px',
        lg: '16px',
        xlg: '24px',
        xl: '32px',
        '2xl': '128px',
        '3xl': '360px',
      },
      boxShadow: {
        xs: '0 0 2px 0 rgba(18, 18, 23, 0.02)',
        sm: '0 1px 2px 0 rgba(18, 18, 23, 0.06), 0 0 2px 0 rgba(18, 18, 23, 0.06)',
        md: '0 2px 4px 0 rgba(18, 18, 23, 0.06), 0 4px 6px 0 rgba(18, 18, 23, 0.08)',
        lg: '0 4px 6px 0 rgba(18, 18, 23, 0.05), 0 10px 15px 0 rgba(18, 18, 23, 0.08)',
        xl: '0 10px 10px 0 rgba(18, 18, 23, 0.04), 0 20px 25px 0 rgba(18, 18, 23, 0.10)',
        '2xl': '0 25px 50px 0 rgba(18, 18, 23, 0.25)',
        'focus-royal': '0 0 0 2px #FFFFFF, 0 0 0 4px #0065F5',
        'focus-danger': '0 0 0 2px #FFFFFF, 0 0 0 4px #F53D6B',
      },
    },
  },
  plugins: [],
}
