import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Adjust target per service/gateway as needed
      "/api": {
        target: "http://localhost:8004", // command-service default
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
