import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const serverPort = process.env.PORT || process.env.SERVER_PORT || 1000;
let backendTarget = process.env.VITE_API_URL || `http://127.0.0.1:${serverPort}`;
// Avoid self-proxying if VITE_API_URL is set to Vite's own dev port (3000)
if (backendTarget.includes(":3000")) {
  backendTarget = `http://127.0.0.1:${serverPort}`;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
      "/health": {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
