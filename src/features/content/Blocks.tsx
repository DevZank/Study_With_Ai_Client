import { useState, useId } from "react";
import {
  blockSchema,
  documentSchema,
  type ContentBlock,
  modes,
} from "./schemas";
import { Formula } from "./Formula";
import { ExerciseCard } from "../exercises/ExerciseCard";

function Flashcard({ front, back }: { front: string; back: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <section className="flashcard">
      <h4>Recuperação ativa</h4>
      <p>{front}</p>
      <button
        type="button"
        aria-expanded={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? "Ocultar verso" : "Mostrar verso"}
      </button>
      {visible && <p>{back}</p>}
    </section>
  );
}

function Diagram({
  block,
}: {
  block: Extract<ContentBlock, { type: "diagram" }>;
}) {
  const marker = useId();
  return (
    <figure className="diagram">
      <svg
        role="img"
        aria-label="Diagrama de relações; descrição completa na lista abaixo"
        viewBox={"0 0 500 " + block.nodes.length * 70}
      >
        <defs>
          <marker
            id={marker}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        {block.edges.map((edge, index) => (
          <path
            key={index}
            d={
              "M 350 " +
              (edge.source * 70 + 25) +
              " C 470 " +
              (edge.source * 70 + 25) +
              ", 470 " +
              (edge.target * 70 + 25) +
              ", 350 " +
              (edge.target * 70 + 25)
            }
            fill="none"
            stroke="currentColor"
            markerEnd={"url(#" + marker + ")"}
          />
        ))}
        {block.nodes.map((node, index) => (
          <g key={index}>
            <rect
              x="5"
              y={index * 70 + 2}
              width="345"
              height="46"
              rx="6"
              fill="#eaf0f5"
            />
            <text x="16" y={index * 70 + 30}>
              {node.length > 38 ? node.slice(0, 35) + "…" : node}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        <ul>
          {block.edges.map((edge, index) => (
            <li key={index}>
              {block.nodes[edge.source]} → {block.nodes[edge.target]}:{" "}
              {edge.label}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

function Block({
  block,
  editable,
}: {
  block: ContentBlock;
  editable: boolean;
}) {
  switch (block.type) {
    case "code":
      return (
        <figure>
          <figcaption>
            Exemplo de código · {block.language} · sem execução
          </figcaption>
          <pre>
            <code>{block.code}</code>
          </pre>
        </figure>
      );
    case "formula":
      return <Formula latex={block.latex} />;
    case "table":
    case "comparison":
      return (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {block.columns.map((c, i) => (
                  <th key={i} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "flashcard":
      return <Flashcard front={block.front} back={block.back} />;
    case "timeline":
      return (
        <ol className="timeline">
          {block.items.map((item, i) => (
            <li key={i}>
              <strong>{item.label}</strong>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
      );
    case "diagram":
      return <Diagram block={block} />;
    case "quiz":
    case "exercise":
      return (
        <ExerciseCard exerciseId={block.exercise_id} editable={editable} />
      );
    case "source":
      return <p className="hint">{block.text}</p>;
    default:
      return (
        <section className={"content-block " + block.type}>
          {block.type === "check_question" && <h4>Pausa para refletir</h4>}
          {block.type === "summary" && <h4>Resumo</h4>}
          {block.type === "hint" && <h4>Dica</h4>}
          {block.type === "example" && <h4>Exemplo</h4>}
          {block.type === "curiosity" && <h4>Uma conexão interessante</h4>}
          <p>{block.text}</p>
        </section>
      );
  }
}

export function Blocks({
  value,
  editable = true,
}: {
  value: unknown;
  editable?: boolean;
}) {
  const doc = documentSchema.safeParse(value);
  if (!doc.success)
    return (
      <p role="status">
        Conteúdo estruturado indisponível ou de uma versão não suportada.
      </p>
    );
  return (
    <div className="structured-content">
      <p className="eyebrow">{modes[doc.data.mode].label}</p>
      <h3>{doc.data.title}</h3>
      {doc.data.blocks.map((value, index) => {
        const parsed = blockSchema.safeParse(value);
        return parsed.success ? (
          <Block key={index} block={parsed.data} editable={editable} />
        ) : (
          <p key={index} role="status">
            Bloco não suportado; conteúdo ocultado com segurança.
          </p>
        );
      })}
    </div>
  );
}
