import { test, expect } from "@playwright/test";

test("exercício estruturado real: responder e recuperar tentativa", async ({
  page,
}) => {
  const model = process.env.E2E_REAL_MODEL;
  test.skip(!model, "Defina E2E_REAL_MODEL para autorizar o Ollama local.");
  await page.goto("/");
  await page
    .getByLabel("Novo tema", { exact: true })
    .fill("Marco 2 real " + Date.now());
  await page.getByRole("button", { name: "Criar tema", exact: true }).click();
  await page
    .getByRole("button", { name: "Nova conversa", exact: true })
    .click();
  await page.getByLabel("Modelo local", { exact: true }).selectOption(model!);
  await page.getByLabel("Modo de aprendizagem").selectOption("practice");
  await expect(page.getByLabel("Modo de aprendizagem")).toBeEnabled();
  await page
    .getByLabel("Sua pergunta")
    .fill(
      "Gere somente um exercício objetivo simples sobre a soma 2 + 2. Seja breve.",
    );
  await page.getByRole("button", { name: "Enviar pergunta" }).click();
  const card = page
    .getByRole("region", { name: "Exercício", exact: true })
    .first();
  await expect(card).toBeVisible({ timeout: 110000 });
  await expect(card.getByText("Ver referência após a tentativa")).toHaveCount(
    0,
  );
  if (await card.getByRole("radio").count())
    await card.getByRole("radio").first().check();
  else await card.getByLabel("Sua resposta", { exact: true }).fill("4");
  await card.getByRole("button", { name: "Responder exercício" }).click();
  await expect(card.getByText("Tentativa 1", { exact: true })).toBeVisible();
  await card.getByText("Ver referência após a tentativa").click();
  await page.reload();
  await expect(page.getByLabel("Modo de aprendizagem")).toHaveValue("practice");
  await expect(
    page.getByText("Tentativa 1", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/marco2-real.png",
    fullPage: true,
  });
});
