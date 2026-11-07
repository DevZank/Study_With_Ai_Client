import { test, expect } from "@playwright/test";

test("tema, conversa, histórico, cancelamento e recuperação visual", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Pular para o conteúdo" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const name = "Tema E2E " + Date.now();
  await page.getByLabel("Novo tema", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Criar tema", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Nova conversa", exact: true })
    .click();
  await page
    .getByLabel("Modelo local", { exact: true })
    .selectOption("e2e:local");
  await page.getByLabel("Sua pergunta").fill("Primeira pergunta");
  await page.getByRole("button", { name: "Enviar pergunta" }).click();
  await expect(page.locator(".assistant")).toContainText("concluído.", {
    timeout: 10000,
  });
  await page.reload();
  await expect(page.locator(".assistant")).toContainText("Primeira pergunta");
  await page
    .getByLabel("Modelo local", { exact: true })
    .selectOption("e2e:local");
  await page.getByLabel("Sua pergunta").fill("Quero cancelar");
  await page.getByRole("button", { name: "Enviar pergunta" }).click();

  await page.getByRole("button", { name: "Cancelar resposta" }).click();
  await expect(page.locator(".assistant").last()).toContainText("Cancelada");
  await page.reload();
  await expect(page.locator(".assistant").last()).toContainText("Cancelada");
  await page
    .getByLabel("Modelo local", { exact: true })
    .selectOption("e2e:local");
  await page.getByLabel("Sua pergunta").fill("Teste de falha");
  await page.getByRole("button", { name: "Enviar pergunta" }).click();
  await expect(page.getByRole("alert")).toContainText("Falha simulada");
  await expect(page.locator(".assistant").last()).toContainText(
    "conteúdo não validado",
  );
  await page.getByText("Gerenciar tema", { exact: true }).click();
  await page.getByLabel("Nome do tema").fill(name + " editado");
  await page.getByRole("button", { name: "Salvar nome" }).click();
  await expect(
    page.getByRole("heading", { name: name + " editado", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Arquivar tema" }).click();
  await expect(
    page.getByRole("button", { name: "Restaurar tema" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restaurar tema" }).click();
  await expect(
    page.getByRole("button", { name: "Arquivar tema" }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Mover para lixeira" }).click();
  await expect(
    page.getByText("Este tema está na lixeira.", { exact: false }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Restaurar tema" }).click();
  await page.getByRole("link", { name: "Conversa 1", exact: true }).click();
  await expect(page.locator(".assistant")).toHaveCount(3);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).not.toHaveCount(0);
});

test("indisponibilidade do Ollama preserva a pergunta e conteúdo HTML permanece texto", async ({
  page,
}) => {
  await page.route("**/api/v1/ai/models", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: { message: "Ollama indisponível no teste." },
      }),
    }),
  );
  await page.goto("/");
  await page
    .getByLabel("Novo tema", { exact: true })
    .fill("Falha e segurança " + Date.now());
  await page.getByRole("button", { name: "Criar tema", exact: true }).click();
  await page
    .getByRole("button", { name: "Nova conversa", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Ollama indisponível");
  const prompt = '<img src=x onerror="alert(1)">';
  await page.getByLabel("Sua pergunta").fill(prompt);
  await expect(
    page.getByRole("button", { name: "Enviar pergunta" }),
  ).toBeDisabled();
  await page.unroute("**/api/v1/ai/models");
  await page.getByRole("button", { name: "Atualizar modelos" }).click();
  await page
    .getByLabel("Modelo local", { exact: true })
    .selectOption("e2e:local");
  await expect(page.getByLabel("Sua pergunta")).toHaveValue(prompt);
  await page.getByRole("button", { name: "Enviar pergunta" }).click();
  await expect(page.locator(".assistant")).toContainText(prompt);
  await expect(page.locator(".messages img")).toHaveCount(0);
});
