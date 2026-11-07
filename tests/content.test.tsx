import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Blocks } from "../src/features/content/Blocks";
import { blockSchema } from "../src/features/content/schemas";
import { formulaMarkup } from "../src/features/content/Formula";

it("escapa HTML em blocos de texto e rejeita blocos executáveis", () => {
  const html = renderToStaticMarkup(
    <Blocks
      value={{
        schema_version: "1.0",
        mode: "learn",
        title: "Teste",
        blocks: [
          { id: "a", type: "explanation", text: '<script>alert("x")</script>' },
          { id: "b", type: "html", html: "<img src=x onerror=alert(1)>" },
        ],
      }}
    />,
  );
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("<img");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("Bloco não suportado");
});

it("versões desconhecidas e documentos inválidos têm fallback seguro", () => {
  expect(
    renderToStaticMarkup(
      <Blocks value={{ schema_version: "99", title: "privado" }} />,
    ),
  ).toContain("versão não suportada");
  expect(
    renderToStaticMarkup(<Blocks value={"JSON inválido com SEGREDO"} />),
  ).not.toContain("SEGREDO");
});

it("não revela o verso do cartão antes da interação", () => {
  const html = renderToStaticMarkup(
    <Blocks
      value={{
        schema_version: "1.0",
        mode: "memorize",
        title: "Teste",
        blocks: [
          {
            id: "f1",
            type: "flashcard",
            front: "Pergunta",
            back: "VERSO_PRIVADO",
          },
        ],
      }}
    />,
  );
  expect(html).toContain("Mostrar verso");
  expect(html).not.toContain("VERSO_PRIVADO");
});

it("rejeita tabelas inconsistentes e referências de diagrama inexistentes", () => {
  expect(
    blockSchema.safeParse({
      id: "a",
      type: "table",
      columns: ["A", "B"],
      rows: [["x"]],
    }).success,
  ).toBe(false);
  expect(
    blockSchema.safeParse({
      id: "a",
      type: "diagram",
      nodes: ["A"],
      edges: [{ source: 0, target: 3, label: "x" }],
    }).success,
  ).toBe(false);
});

it("fórmulas não criam links ou imagens externas e têm limites", () => {
  const html = formulaMarkup(String.raw`\href{javascript:alert(1)}{x}`) || "";
  expect(html).not.toContain("<a ");
  expect(html).not.toContain("<img");
  expect(formulaMarkup("x".repeat(1001))).toBeNull();
  expect(formulaMarkup("x^2")).toContain("math");
});
