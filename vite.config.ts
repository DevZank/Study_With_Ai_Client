import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    host: "127.0.0.1",
    strictPort: true,
    proxy: { "/api/v1": "http://127.0.0.1:8000" },
  },
  preview: {
    host: "127.0.0.1",
    proxy: { "/api/v1": "http://127.0.0.1:8000" },
  },
});
