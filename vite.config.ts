import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

const apiPort = Number(process.env.STUDY_API_PORT || "8000");
const webPort = Number(process.env.STUDY_WEB_PORT || "5173");
if (
  ![apiPort, webPort].every(
    (port) => Number.isInteger(port) && port > 0 && port <= 65535,
  )
)
  throw new Error("Porta local inválida.");

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: webPort,
    host: "127.0.0.1",
    strictPort: true,
    proxy: { "/api/v1": "http://127.0.0.1:" + apiPort },
  },
  preview: {
    host: "127.0.0.1",
    proxy: { "/api/v1": "http://127.0.0.1:" + apiPort },
  },
});
