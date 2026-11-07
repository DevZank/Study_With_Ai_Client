import { test, expect } from "@playwright/test";

test("modelo local real: gerar, cancelar e recuperar histórico", async ({
  page,
}) => {
  const model = process.env.E2E_REAL_MODEL;
  test.skip(
    !model,
    "Defina E2E_REAL_MODEL para autorizar a validação local real.",
  );
  await page.goto("/");
  await page
    .getByLabel("Novo tema", { exact: true })
    .fill("Validação real " + Date.now());
  await page.getByRole("button", { name: "Criar tema", exact: true }).click();
  await page
    .getByRole("button", { name: "Nova conversa", exact: true })
    .click();
  await page.getByLabel("Modelo local", { exact: true }).selectOption(model!);
  await page
    .getByLabel("Sua pergunta")
    .fill("Responda em uma frase: quanto é dois mais dois?");
  await page.getByRole("button", { name: "Enviar pergunta" }).click();
  await expect(page.locator(".assistant .message-content")).not.toHaveText(
    "Aguardando o modelo…",
    { timeout: 100000 },
  );
  await expect(
    page.getByRole("button", { name: "Cancelar resposta" }),
  ).toHaveCount(0, { timeout: 100000 });
  const answer = await page
    .locator(".assistant .message-content")
    .textContent();
  expect(answer?.trim().length).toBeGreaterThan(0);
  await page
    .getByLabel("Sua pergunta")
    .fill(
      "Escreva uma explicação longa, de mil palavras, sobre números inteiros.",
    );
  await page.getByRole("button", { name: "Enviar pergunta" }).click();
  await expect(page.locator(".assistant")).toHaveCount(2);
  await expect(
    page.locator(".assistant .message-content").last(),
  ).not.toHaveText("Aguardando o modelo…", { timeout: 100000 });
  await page.getByRole("button", { name: "Cancelar resposta" }).click();
  await expect(page.locator(".assistant").last()).toContainText("Cancelada");
  await page.reload();
  await expect(page.locator(".assistant")).toHaveCount(2);
  await expect(page.locator(".assistant").first()).toContainText(answer!);
  await expect(page.locator(".assistant").last()).toContainText("Cancelada");
  await page.screenshot({
    path: "test-results/real-ollama.png",
    fullPage: true,
  });
});
