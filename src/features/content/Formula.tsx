import katex from "katex";
import "katex/dist/katex.min.css";

export function formulaMarkup(latex: string): string | null {
  if (latex.length > 1000) return null;
  try {
    return katex.renderToString(latex, {
      trust: false,
      strict: "error",
      throwOnError: true,
      maxExpand: 100,
      maxSize: 10,
      displayMode: true,
      output: "htmlAndMathml",
    });
  } catch {
    return null;
  }
}

export function Formula({ latex }: { latex: string }) {
  const markup = formulaMarkup(latex);
  // Somente markup produzido pelo parser local do KaTeX; nunca HTML enviado pelo modelo.
  return markup ? (
    <div className="formula" dangerouslySetInnerHTML={{ __html: markup }} />
  ) : (
    <div>
      <p>Não foi possível apresentar esta fórmula.</p>
      <code>{latex}</code>
    </div>
  );
}
