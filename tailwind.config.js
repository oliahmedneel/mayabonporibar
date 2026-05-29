/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Noto Sans Bengali", "system-ui", "sans-serif"],
      },
      colors: {
        mayabon: {
          green: "#047857",
          deep: "#064e3b",
          gold: "#b7791f",
        },
      },
    },
  },
  plugins: [],
};
