/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", 
    "./public/index.html", 
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
      colors: {
        brand: {
          primary: "#B3884A",      // Gold
          dark: "#2C2C2C",         // Dark gray/black
          light: "#F5F5F5",        // Light background
          text: "#1E1E1E",         // Rich black for text
          muted: "#888888",        // Subtle text
        },
      },
      backgroundImage: {
        "confession-gradient":
          "linear-gradient(134deg, rgba(0, 0, 0, 0.58) 46.64%, rgba(42, 4, 128, 0.77) 77.39%)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
      animation: {
        marquee: "marquee 10s linear infinite",
      },
    },
  },
  plugins: [],
};
