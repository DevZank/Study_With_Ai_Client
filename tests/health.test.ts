import { afterEach, expect, it, vi } from "vitest";
import { checkHealth } from "../src/lib/health";

afterEach(() => vi.unstubAllGlobals());

it("reconhece uma resposta válida do healthcheck", async () => {
  vi.stubGlobal("fetch", async () => Response.json({ status: "ok" }));
  await expect(
    checkHealth(new AbortController().signal),
  ).resolves.toBeUndefined();
});

it("rejeita uma resposta inválida mesmo com HTTP 200", async () => {
  vi.stubGlobal("fetch", async () => Response.json({ status: "unknown" }));
  await expect(checkHealth(new AbortController().signal)).rejects.toThrow();
});
