/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Diambil langsung dari warna biru logo ACC (public/logo_acc.png,
        // sample pixel #0072BC) — bukan warna generik.
        brand: {
          50: "#eff8ff",
          100: "#dbeefe",
          200: "#b8defd",
          300: "#7cc3fb",
          400: "#38a2f2",
          500: "#0d87e0",
          600: "#0072bc",
          700: "#005c98",
          800: "#00487a",
          900: "#003a63",
        },
      },
    },
  },
  plugins: [],
};
