/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          50:  '#FDFCFA',
          100: '#FBF9F5',
          200: '#F5F0E8',
          300: '#ECE5D8',
          400: '#E0D8C8',
          500: '#D6CDB7',
        },
        brand: {
          orange: '#F97316',
          'orange-dark': '#EA580C',
          'orange-light': '#FB923C',
          obsidian: '#0F172A',
          charcoal: '#1E293B',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      keyframes: {
        textGradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        logo: "textGradient 3s ease infinite, scaleIn 1s ease-out",
      },
    },
  },
  plugins: [],
};
