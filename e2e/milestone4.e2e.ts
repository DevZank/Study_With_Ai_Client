import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("caderno: texto rico, pasta, desenho, recarga e exportações locais", async ({
  page,
  request,
}) => {
  const external: string[] = [];
  // A máquina injeta chamadas do antivírus no Edge; elas não pertencem à aplicação.
  page.on("request", (r) => {
    if (
      /^https?:/.test(r.url()) &&
      !r.url().startsWith("http://127.0.0.1:15173") &&
      !new URL(r.url()).hostname.endsWith(".kaspersky-labs.com")
    )
      external.push(r.url());
  });
  await page.goto("/#/notebooks");
  await page
    .locator("summary")
    .filter({ hasText: /^Criar caderno$/ })
    .click();
  const name = "Caderno E2E " + Date.now();
  await page.getByLabel("Nome do caderno", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "Criar caderno", exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByText("Gerenciar pastas", { exact: true }).click();
  await page.getByLabel("Nome da pasta", { exact: true }).fill("Fundamentos");
  await page.getByRole("button", { name: "Salvar pasta", exact: true }).click();
  await page.getByText("Nova página", { exact: true }).click();
  await page.getByLabel("Nome da nova página").fill("Anotações autorais");
  await page
    .getByLabel("Pasta da nova página")
    .selectOption({ label: "Fundamentos" });
  await page.getByRole("button", { name: "Criar página", exact: true }).click();
  const editor = page.getByRole("region", {
    name: "Página do caderno",
    exact: true,
  });
  const text = page.getByRole("textbox", {
    name: "Conteúdo da página",
    exact: true,
  });
  await text.fill("Minha anotação persistida.");
  await text.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Negrito", exact: true }).click();
  await expect(text.locator("strong")).toContainText(
    "Minha anotação persistida.",
  );
  await expect(
    editor.getByText("Salvo no computador.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(text.locator("strong")).toContainText(
    "Minha anotação persistida.",
  );
  await page
    .getByRole("button", { name: "Abrir quadro de desenho", exact: true })
    .click();
  const board = page.getByRole("region", {
    name: "Quadro de desenho",
    exact: true,
  });
  const rectangle = board.locator('[data-testid="toolbar-rectangle"]');
  await rectangle.locator("..").click();
  const surface = board.locator("canvas.excalidraw__canvas.interactive");
  await expect(surface).toBeVisible();
  const bounds = await surface.boundingBox();
  if (!bounds) throw new Error("Canvas sem dimensões.");
  await page.mouse.move(bounds.x + bounds.width * 0.45, bounds.y + 200);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + 320, {
    steps: 8,
  });
  await page.mouse.up();
  const pid = page.url().split("/pages/")[1];
  await expect
    .poll(async () => {
      const r = await request.get("/api/v1/pages/" + pid + "/drawing");
      const data = (await r.json()) as { scene: { elements: unknown[] } };
      return data.scene.elements.length;
    })
    .toBeGreaterThan(0);
  await expect(
    board.getByText("Salvo no computador.", { exact: true }),
  ).toBeVisible();
  const editable = page.waitForEvent("download");
  await board
    .getByRole("button", { name: "Exportar .excalidraw", exact: true })
    .click();
  const editableFile = await editable;
  expect(editableFile.suggestedFilename()).toBe("quadro.excalidraw");
  const editablePath = await editableFile.path();
  if (!editablePath) throw new Error("Exportação ausente.");
  const scene = JSON.parse(await readFile(editablePath, "utf8")) as {
    type: string;
    elements: unknown[];
  };
  expect(scene.type).toBe("excalidraw");
  expect(scene.elements.length).toBeGreaterThan(0);
  const png = page.waitForEvent("download");
  await board
    .getByRole("button", { name: "Exportar PNG", exact: true })
    .click();
  const pngFile = await png;
  expect(pngFile.suggestedFilename()).toBe("quadro.png");
  const pngPath = await pngFile.path();
  if (!pngPath) throw new Error("PNG ausente.");
  expect((await readFile(pngPath)).subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Abrir quadro de desenho", exact: true })
    .click();
  await expect(
    board.locator("canvas.excalidraw__canvas.interactive"),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const r = await request.get("/api/v1/pages/" + pid + "/drawing");
      const data = (await r.json()) as { scene: { elements: unknown[] } };
      return data.scene.elements.length;
    })
    .toBeGreaterThan(0);
  await page.screenshot({
    path: "test-results/marco4-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/marco4-mobile.png",
    fullPage: true,
  });
  expect(external).toEqual([]);
});

test("mover página entre cadernos, pesquisar e abrir vínculo", async ({
  page,
  request,
}) => {
  const book1 = (await (
    await request.post("/api/v1/notebooks", {
      data: { title: "Origem " + Date.now() },
    })
  ).json()) as { id: string };
  const book2 = (await (
    await request.post("/api/v1/notebooks", {
      data: { title: "Destino " + Date.now() },
    })
  ).json()) as { id: string };
  const p1 = (await (
    await request.post(`/api/v1/notebooks/${book1.id}/pages`, {
      data: { title: "Página para mover" },
    })
  ).json()) as { id: string };
  const p2 = (await (
    await request.post(`/api/v1/notebooks/${book2.id}/pages`, {
      data: { title: "Página vinculada" },
    })
  ).json()) as { id: string };
  await page.goto(`/#/notebooks/${book1.id}/pages/${p1.id}`);
  await page.getByText("Organizar página e vínculos", { exact: true }).click();
  await page.getByLabel("Mover para caderno").selectOption(book2.id);
  await page.getByLabel("Tags separadas por vírgula").fill("vínculo único");
  await page.getByLabel("Endereço ou ID de outra página").fill(p2.id);
  await page
    .getByRole("button", { name: "Vincular página", exact: true })
    .click();
  const region = page.getByRole("region", {
    name: "Página do caderno",
    exact: true,
  });
  await expect(
    region.getByText("Salvo no computador.", { exact: true }),
  ).toBeVisible();
  await region
    .getByRole("link", { name: "Página vinculada", exact: true })
    .click();
  await expect(
    region.getByRole("heading", { name: "Página vinculada", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Pesquisar páginas, texto e tags")
    .fill("vínculo único");
  const pages = page.getByRole("navigation", {
    name: "Páginas do caderno",
    exact: true,
  });
  await expect(
    pages.getByRole("link", { name: "Página para mover", exact: true }),
  ).toBeVisible();
  await pages
    .getByRole("link", { name: "Página para mover", exact: true })
    .click();
  await expect(
    region.getByRole("heading", { name: "Página para mover", exact: true }),
  ).toBeVisible();
});

test("recorte mantém origem, cópia editável e rascunho após falha de rede", async ({
  page,
  request,
}) => {
  const topic = (await (
    await request.post("/api/v1/topics", {
      data: { title: "Recorte " + Date.now() },
    })
  ).json()) as { id: string };
  const book = (await (
    await request.post("/api/v1/notebooks", {
      data: { title: "Caderno do recorte", topic_id: topic.id },
    })
  ).json()) as { id: string };
  const conv = (await (
    await request.post(`/api/v1/topics/${topic.id}/conversations`, {
      data: { title: "Conversa de origem" },
    })
  ).json()) as { id: string };
  await page.goto(`/#/topics/${topic.id}/conversations/${conv.id}`);
  await page
    .getByLabel("Modelo local", { exact: true })
    .selectOption("e2e:local");
  await page.getByLabel("Sua pergunta").fill("Soma simples");
  await page
    .getByRole("button", { name: "Enviar pergunta", exact: true })
    .click();
  await expect(page.locator(".structured-content")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Selecionar trecho para o caderno",
      exact: true,
    })
    .click();
  const source = page.getByLabel("Texto da resposta para recorte", {
    exact: true,
  });
  await expect(source).toBeVisible();
  const original = await source.innerText();
  await source.evaluate((el) => {
    const s = window.getSelection(),
      r = document.createRange();
    r.selectNodeContents(el);
    s?.removeAllRanges();
    s?.addRange(r);
    el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  });
  await page.getByLabel("Caderno de destino").selectOption(book.id);
  await page.getByLabel("Título da página para o recorte").fill("Trecho salvo");
  await page
    .getByRole("button", { name: "Confirmar recorte", exact: true })
    .click();
  await page.getByRole("link", { name: "Abrir página", exact: true }).click();
  const text = page.getByRole("textbox", {
    name: "Conteúdo da página",
    exact: true,
  });
  await expect(text).toContainText(original.slice(0, 20));
  await text.fill("Minha cópia editada");
  const region = page.getByRole("region", {
    name: "Página do caderno",
    exact: true,
  });
  await expect(
    region.getByText("Salvo no computador.", { exact: true }),
  ).toBeVisible();
  await page.getByText("Origem dos recortes", { exact: true }).click();
  await expect(region.locator("blockquote")).toHaveText(original);
  const url = page.url();
  await page.route("**/api/v1/pages/*", (route) =>
    route.request().method() === "PATCH" ? route.abort() : route.continue(),
  );
  await text.fill("Rascunho recuperável offline");
  await expect(region.getByRole("alert")).toContainText(
    "Não foi possível acessar",
  );
  await page.unroute("**/api/v1/pages/*");
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(text).toContainText("Rascunho recuperável offline");
  await expect(
    region.getByText("Salvo no computador.", { exact: true }),
  ).toBeVisible();
  expect(page.url()).toBe(url);
});
