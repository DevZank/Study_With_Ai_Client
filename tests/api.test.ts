import { afterEach, expect, it, vi } from "vitest";
import { api, parseStream, modelsSchema } from "../src/lib/api";

afterEach(() => vi.unstubAllGlobals());

it("rejeita dados que não correspondem ao contrato", async () => {
  vi.stubGlobal("fetch", async () => Response.json({ models: "inventado" }));
  await expect(api("/ai/models", modelsSchema)).rejects.toThrow(
    "dados inesperados",
  );
});

it("preserva mensagens de erro seguras da API", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json(
      { error: { message: "Ollama indisponível." } },
      { status: 503 },
    ),
  );
  await expect(api("/ai/models", modelsSchema)).rejects.toThrow(
    "Ollama indisponível.",
  );
});

it("não quebra ao receber JSON de streaming inválido", () => {
  expect(parseStream("não é JSON").success).toBe(false);
  expect(parseStream('{"job_id":"não é UUID"}').success).toBe(false);
});
