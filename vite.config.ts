import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-16.png", "favicon-32.png", "apple-touch-icon.png", "logo_acc.png"],
      manifest: {
        name: "Absensi ACC - Telemarketing Officer",
        short_name: "Absensi ACC",
        description: "Sistem Informasi Absensi Karyawan - PT Astra Credit Companies",
        theme_color: "#0072bc",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        // exceljs/jspdf sudah dimuat lewat dynamic import (lihat src/lib/reports.ts)
        // dan lebih besar dari default 2MB precache limit — biarkan browser fetch
        // langsung dari network saat dibutuhkan, tidak perlu diprecache offline.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
