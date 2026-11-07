import { test, expect } from "@playwright/test";
import { z } from "zod";
import { messageSchema } from "../src/lib/api";
import { blockSchema, documentSchema } from "../src/features/content/schemas";

test("quatro modos, gabarito protegido, dicas, tentativa e recarga", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Novo tema", { exact: true })
    .fill("Marco 2 " + Date.now());
  await page.getByRole("button", { name: "Criar tema", exact: true }).click();
  await page
    .getByRole("button", { name: "Nova conversa", exact: true })
    .click();
  await page
    .getByLabel("Modelo local", { exact: true })
    .selectOption("e2e:local");
  for (const mode of ["study", "memorize", "learn", "practice"]) {
    await page
      .getByLabel("Modo de aprendizagem", { exact: true })
      .selectOption(mode);
    await expect(page.getByLabel("Modo de aprendizagem")).toBeEnabled();
    await page.getByLabel("Sua pergunta").fill("Matemática");
    await page.getByRole("button", { name: "Enviar pergunta" }).click();
    await expect(
      page.getByRole("button", { name: "Cancelar resposta" }),
    ).toHaveCount(0);
    await expect(page.locator(".structured-content")).toHaveCount(
      ["study", "memorize", "learn", "practice"].indexOf(mode) + 1,
    );
  }
  await expect(page.locator("table")).toBeVisible();
  await expect(page.locator(".katex")).toBeVisible();
  await page.getByRole("button", { name: "Mostrar verso" }).click();
  await expect(page.getByText("Quatro.", { exact: true })).toBeVisible();
  const cards = page.getByRole("region", { name: "Exercício", exact: true });
  await expect(cards).toHaveCount(1);
  const conversationId = page.url().split("/conversations/")[1];
  const history = await request.get(
    "/api/v1/conversations/" + conversationId + "/messages",
  );
  expect(await history.text()).not.toContain("answer_key");
  expect(await history.text()).not.toContain("Referência sintética");
  const data = z
    .object({ items: z.array(messageSchema) })
    .parse(await history.json());
  const contentDocument = documentSchema.parse(data.items.at(-1)?.document);
  const reference = blockSchema.parse(contentDocument.blocks[0]);
  if (reference.type !== "quiz" && reference.type !== "exercise")
    throw new Error("Referência de exercício não encontrada.");
  const exerciseId = reference.exercise_id;
  const before = await request.get("/api/v1/exercises/" + exerciseId);
  expect(
    z.object({ solution: z.string().nullable() }).parse(await before.json())
      .solution,
  ).toBeNull();
  await cards.getByRole("button", { name: "Pedir próxima dica" }).click();
  await expect(cards.getByText(/Dica 1:/)).toBeVisible();
  await expect(cards.getByText("Ver referência após a tentativa")).toHaveCount(
    0,
  );
  await cards.getByLabel("4", { exact: true }).check();
  await cards.getByRole("button", { name: "Responder exercício" }).click();
  await expect(
    cards.getByText("Resposta de acordo com o gabarito.", { exact: false }),
  ).toBeVisible();
  await cards.getByText("Ver referência após a tentativa").click();
  await expect(
    cards.getByText("Referência sintética exclusiva do teste.", {
      exact: true,
    }),
  ).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel("Modo de aprendizagem")).toHaveValue("practice");
  await expect(page.locator(".structured-content")).toHaveCount(4);
  await expect(page.getByText("Tentativa 1", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/marco2-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/marco2-mobile.png",
    fullPage: true,
  });
});

test("JSON inválido não expõe rascunho e questão aberta não recebe nota automática", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Novo tema", { exact: true })
    .fill("Validação " + Date.now());
  await page.getByRole("button", { name: "Criar tema", exact: true }).click();
  await page
    .getByRole("button", { name: "Nova conversa", exact: true })
    .click();
  await page
    .getByLabel("Modelo local", { exact: true })
    .selectOption("e2e:local");
  await page.getByLabel("Sua pergunta").fill("JSON inválido");
  await page.getByRole("button", { name: "Enviar pergunta" }).click();
  await expect(page.getByRole("alert")).toContainText("conteúdo válido");
  await expect(page.locator("body")).not.toContainText("SEGREDO_NAO_EXIBIR");
  await page.getByLabel("Modo de aprendizagem").selectOption("practice");
  await expect(page.getByLabel("Modo de aprendizagem")).toBeEnabled();
  await page.getByLabel("Sua pergunta").fill("Questão aberta");
  await page.getByRole("button", { name: "Enviar pergunta" }).click();
  const card = page.getByRole("region", { name: "Exercício", exact: true });
  await card
    .getByLabel("Sua resposta", { exact: true })
    .fill("Minha explicação autoral.");
  await card.getByRole("button", { name: "Responder exercício" }).click();
  await expect(
    card.getByText("nenhuma nota automática", { exact: false }),
  ).toBeVisible();
});
