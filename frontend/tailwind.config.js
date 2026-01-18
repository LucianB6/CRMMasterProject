/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        slate: {
          950: "#020617"
        }
      },
      boxShadow: {
        glow: "0 20px 80px rgba(14, 165, 233, 0.2)",
        card: "0 16px 40px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};
