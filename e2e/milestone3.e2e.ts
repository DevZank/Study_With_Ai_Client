import { test, expect } from "@playwright/test";

test("trilha editável, unidade sob demanda, resumo, contexto e versões", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Novo tema", { exact: true })
    .fill("Marco 3 " + Date.now());
  await page.getByRole("button", { name: "Criar tema", exact: true }).click();
  await page
    .getByRole("button", { name: "Trilhas guiadas", exact: true })
    .click();
  await page.getByLabel("Modelo local para a trilha").selectOption("e2e:local");
  await page.getByText("Criar trilha", { exact: true }).click();
  await page.getByLabel("Objetivo de aprendizagem").fill("Aprender soma");
  await page.getByRole("button", { name: "Gerar somente o plano" }).click();
  await expect(page.locator(".trail-module")).toHaveCount(5);
  await expect(page.locator(".structured-content")).toHaveCount(0);
  await page.getByText("Renomear trilha", { exact: true }).click();
  await page
    .getByLabel("Título da trilha", { exact: true })
    .fill("Soma guiada");
  await page
    .getByRole("button", { name: "Salvar título", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Soma guiada", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Soma guiada", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Modelo local para a trilha").selectOption("e2e:local");
  await page
    .getByRole("button", { name: "Etapa 1 · não gerada", exact: true })
    .click();
  await page.getByRole("button", { name: "Gerar e abrir unidade" }).click();
  const reader = page.getByRole("region", {
    name: "Unidade da trilha",
    exact: true,
  });
  await expect(reader.locator(".structured-content")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /não gerada$/ })).toHaveCount(
    5,
  );
  await reader
    .getByLabel("Dificuldades que você identificou (opcional)")
    .fill("Dúvida na soma");
  await reader
    .getByRole("button", { name: "Concluir unidade e gerar resumo" })
    .click();
  await expect(
    reader.getByRole("heading", { name: "Resumo de conclusão" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Aula 2.1 · não gerada", exact: true })
    .click();
  await page.getByRole("button", { name: "Gerar e abrir unidade" }).click();
  await expect(reader.locator(".structured-content")).toHaveCount(1);
  await reader
    .getByText("Continuidade usada nesta versão", { exact: true })
    .click();
  await expect(
    reader.getByText(/Dificuldades informadas anteriormente: Dúvida na soma/),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await reader
    .getByRole("button", { name: "Gerar nova versão", exact: true })
    .click();
  await expect(
    reader.getByLabel("Versão do conteúdo").locator("option"),
  ).toHaveCount(2);
  await page.reload();
  await expect(
    reader.getByLabel("Versão do conteúdo").locator("option"),
  ).toHaveCount(2);
  await page.screenshot({
    path: "test-results/marco3-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/marco3-mobile.png",
    fullPage: true,
  });
});
