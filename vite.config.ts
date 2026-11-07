import { defineConfig } from "vite";

export default defineConfig({
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
