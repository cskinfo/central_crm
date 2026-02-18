import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000", // <--- CHANGE THIS from localhost to 127.0.0.1
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
