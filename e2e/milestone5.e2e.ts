import { test, expect } from "@playwright/test";

test("memorização FSRS, indicadores separados, recomendações e gamificação opcional", async ({
  page,
}) => {
  await page.goto("/");
  const topicTitle = "Marco 5 " + Date.now();
  await page.getByLabel("Novo tema", { exact: true }).fill(topicTitle);
  await page.getByRole("button", { name: "Criar tema", exact: true }).click();

  await page
    .getByRole("button", { name: "Nova conversa", exact: true })
    .click();

  await page
    .getByLabel("Modelo local", { exact: true })
    .selectOption("e2e:local");
  await page
    .getByLabel("Modo de aprendizagem", { exact: true })
    .selectOption("memorize");
  await expect(page.getByLabel("Modo de aprendizagem")).toBeEnabled();
  await page.getByLabel("Sua pergunta").fill("Cartões de soma");
  await page
    .getByRole("button", { name: "Enviar pergunta", exact: true })
    .click();
  await expect(page.locator(".structured-content")).toHaveCount(1);

  await page
    .getByRole("button", { name: "Salvar na revisão espaçada", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Salvo na revisão espaçada",
      exact: true,
    }),
  ).toBeVisible();

  await page
    .getByLabel("Modo de aprendizagem", { exact: true })
    .selectOption("practice");
  await expect(page.getByLabel("Modo de aprendizagem")).toBeEnabled();
  await page.getByLabel("Sua pergunta").fill("Exercício de soma");
  await page
    .getByRole("button", { name: "Enviar pergunta", exact: true })
    .click();
  await expect(page.locator(".structured-content")).toHaveCount(2);

  const exerciseCard = page.getByRole("region", {
    name: "Exercício",
    exact: true,
  });
  await exerciseCard.getByLabel("4", { exact: true }).check();
  await exerciseCard
    .getByRole("button", { name: "Responder exercício", exact: true })
    .click();
  await expect(
    exerciseCard.getByText("Resposta de acordo com o gabarito.", {
      exact: false,
    }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Memorizar e revisão", exact: true })
    .click();
  const memorize = page.getByRole("region", {
    name: "Memorização e revisão espaçada",
    exact: true,
  });
  await expect(
    memorize.getByRole("heading", {
      name: "Fila de revisão agora (1 cartão pendente)",
    }),
  ).toBeVisible();

  await memorize
    .getByRole("button", { name: "Revelar resposta do cartão", exact: true })
    .click();
  await memorize.getByRole("button", { name: "3 · Bom", exact: true }).click();
  await expect(
    memorize.getByRole("heading", {
      name: "Fila de revisão agora (0 cartões pendentes)",
    }),
  ).toBeVisible();

  await memorize.getByText("Criar flashcard", { exact: true }).click();
  await memorize
    .getByLabel("Frente do cartão (pergunta)")
    .fill("Derivada de x²?");
  await memorize.getByLabel("Verso do cartão (resposta)").fill("2x");
  await memorize
    .getByLabel("Conceito relacionado (opcional)")
    .fill("Cálculo diferencial");
  await memorize
    .getByRole("button", { name: "Adicionar flashcard", exact: true })
    .click();
  await expect(
    memorize.getByRole("heading", { name: "Cartões deste tema (2)" }),
  ).toBeVisible();

  const manualItem = memorize
    .locator(".trail-module")
    .filter({ hasText: "Derivada de x²?" });
  await manualItem
    .getByText("Editar cartão: Derivada de x²?", { exact: true })
    .click();
  await manualItem.getByLabel("Verso do cartão").fill("2x (regra da potência)");
  await manualItem
    .getByRole("button", { name: "Salvar alterações do cartão", exact: true })
    .click();
  await expect(manualItem.getByText("2x (regra da potência)")).toBeVisible();

  const importedItem = memorize
    .locator(".trail-module")
    .filter({ hasText: "Origem: Resposta da IA" });
  await importedItem
    .getByText("Histórico de revisões", { exact: true })
    .click();
  await expect(importedItem.getByText(/Revisão 1: nota 3/)).toBeVisible();

  await page.reload();
  await expect(
    memorize.getByRole("heading", { name: "Cartões deste tema (2)" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Progresso e métricas", exact: true })
    .click();
  const progress = page.getByRole("region", {
    name: "Progresso e métricas pedagógicas",
    exact: true,
  });
  await expect(
    progress.getByRole("article", { name: "Indicador de conclusão" }),
  ).toBeVisible();
  await expect(
    progress.getByRole("article", { name: "Indicador de domínio" }),
  ).toBeVisible();
  await expect(
    progress.getByRole("article", { name: "Indicador de retenção" }),
  ).toBeVisible();
  await expect(
    progress.getByRole("region", { name: "Domínio detalhado por conceito" }),
  ).toBeVisible();
  await expect(
    progress.getByRole("region", { name: "Sugestões pedagógicas" }),
  ).toBeVisible();

  const gamification = progress.getByRole("region", {
    name: "Gamificação leve",
    exact: true,
  });
  await expect(gamification.getByText(/Nível 1/)).toBeVisible();

  await gamification
    .getByRole("button", {
      name: "Ocultar gamificação",
      exact: true,
    })
    .click();
  await expect(
    gamification.getByRole("button", {
      name: "Exibir gamificação",
      exact: true,
    }),
  ).toBeVisible();

  await page.reload();
  await expect(
    gamification.getByRole("button", {
      name: "Exibir gamificação",
      exact: true,
    }),
  ).toBeVisible();
  await gamification
    .getByRole("button", { name: "Exibir gamificação", exact: true })
    .click();
  await expect(gamification.getByText(/Nível 1/)).toBeVisible();

  await page.screenshot({
    path: "test-results/marco5-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/marco5-mobile.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page
    .getByRole("link", { name: "Revisões e progresso", exact: true })
    .click();
  const overview = page.getByRole("region", {
    name: "Visão geral de revisões e progresso",
    exact: true,
  });
  await expect(
    overview.getByRole("heading", {
      name: "Fila global de revisão espaçada",
      exact: true,
    }),
  ).toBeVisible();
});
