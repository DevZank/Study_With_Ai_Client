// Recursos do quadro ficam locais também na instalação de produção.
import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
await mkdir(new URL("public/excalidraw", root), { recursive: true });
await cp(
  fileURLToPath(
    new URL("node_modules/@excalidraw/excalidraw/dist/prod/fonts", root),
  ),
  fileURLToPath(new URL("public/excalidraw/fonts", root)),
  { recursive: true },
);
await cp(
  fileURLToPath(new URL("docs/licenses", root)),
  fileURLToPath(new URL("public/excalidraw/licenses", root)),
  { recursive: true },
);
