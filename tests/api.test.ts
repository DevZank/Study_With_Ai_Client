import { afterEach, expect, it, vi } from "vitest";
import { api, parseStream, modelsSchema } from "../src/lib/api";
import {
  flashcardViewSchema,
  formatPct,
  topicProgressSchema,
} from "../src/features/progress/api";

afterEach(() => vi.unstubAllGlobals());

it("trata JSON inválido sem expor detalhes técnicos ao usuário", async () => {
  vi.stubGlobal("fetch", async () => new Response("<html>erro</html>"));
  await expect(api("/ai/models", modelsSchema)).rejects.toThrow(
    "resposta JSON inválida",
  );
});

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

it("valida indicadores separados de progresso e estado FSRS de flashcards", () => {
  expect(formatPct(null)).toBe("Não estimado");
  expect(formatPct(0.846)).toBe("85%");
  expect(
    flashcardViewSchema.safeParse({
      card: {
        id: "11111111-1111-4111-8111-111111111111",
        topic_id: "22222222-2222-4222-8222-222222222222",
        concept_id: "33333333-3333-4333-8333-333333333333",
        concept_name: "Soma",
        front: "Frente",
        back: "Verso",
        source_type: "manual",
        source_ref: {},
        archived: false,
        version: 1,
        created_at: "2026-11-10T12:00:00+00:00",
        updated_at: "2026-11-10T12:00:00+00:00",
      },
      review_state: {
        id: "44444444-4444-4444-8444-444444444444",
        flashcard_id: "11111111-1111-4111-8111-111111111111",
        topic_id: "22222222-2222-4222-8222-222222222222",
        due_at: "2026-11-13T12:00:00+00:00",
        stability: 3.1,
        difficulty: 5.2,
        reps: 1,
        lapses: 0,
        state: "review",
        last_reviewed_at: "2026-11-10T12:00:00+00:00",
        version: 2,
      },
      estimated_retention: 0.9,
      due: false,
    }).success,
  ).toBe(true);
  expect(
    topicProgressSchema.safeParse({
      topic_id: "22222222-2222-4222-8222-222222222222",
      completion: { completed_units: 1, total_units: 2, ratio: 0.5 },
    }).success,
  ).toBe(false);
});
