/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        Dosis: ["Dosis", "sans-serif"],
        Roboto: ["Roboto", "sans-serif"],
      },
    },
    screens: {
      "2xl": { max: "1535px" },
      // => @media (max-width: 1535px) { ... }

      xl: { max: "1279px" },
      // => @media (max-width: 1279px) { ... }

      lg: { max: "1175px" },
      // => @media (max-width: 1023px) { ... }

      sm: { max: "850px" },
      // => @media (max-width: 639px) { ... }
    },
  },
  plugins: [],
};
