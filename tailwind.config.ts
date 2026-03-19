import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#DB1A1A",
        background: "#FFF6F6",
        accent: "#8CC7C4",
        "dark-accent": "#2C687B",
        surface: "#FFFDFD",
        ink: "#2B1616",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 20px 50px rgba(44, 104, 123, 0.12)",
      },
      backgroundImage: {
        halo: "radial-gradient(circle at top, rgba(140, 199, 196, 0.36), transparent 40%)",
      },
    },
  },
  plugins: [],
};

export default config;
