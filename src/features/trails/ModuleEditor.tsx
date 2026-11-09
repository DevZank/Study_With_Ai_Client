import { useState } from "react";
import type { ModuleView } from "./api";

export function ModuleEditor({
  item,
  busy,
  save,
}: {
  item: ModuleView;
  busy: boolean;
  save: (plan: ModuleView["module"]["plan"]) => void;
}) {
  const [title, setTitle] = useState(item.module.plan.title);
  const [objectives, setObjectives] = useState(
    item.module.plan.objectives.join("\n"),
  );
  const [criteria, setCriteria] = useState(
    item.module.plan.criteria.join("\n"),
  );
  const label = item.module.id;
  return (
    <details>
      <summary>Editar módulo: {item.module.plan.title}</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save({
            ...item.module.plan,
            title,
            objectives: objectives
              .split("\n")
              .map((t) => t.trim())
              .filter(Boolean),
            criteria: criteria
              .split("\n")
              .map((t) => t.trim())
              .filter(Boolean),
          });
        }}
      >
        <label htmlFor={label + "title"}>Título do módulo</label>
        <input
          id={label + "title"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          required
        />
        <label htmlFor={label + "goals"}>Objetivos, um por linha</label>
        <textarea
          id={label + "goals"}
          value={objectives}
          onChange={(e) => setObjectives(e.target.value)}
          maxLength={960}
          required
        />
        <label htmlFor={label + "criteria"}>Critérios, um por linha</label>
        <textarea
          id={label + "criteria"}
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          maxLength={640}
          required
        />
        <p className="hint">
          As unidades já planejadas e versões anteriores são preservadas. Para
          outra divisão, adicione um módulo.
        </p>
        <button
          disabled={
            busy || !title.trim() || !objectives.trim() || !criteria.trim()
          }
        >
          Salvar módulo
        </button>
      </form>
    </details>
  );
}

export function AddModule({
  busy,
  add,
}: {
  busy: boolean;
  add: (plan: ModuleView["module"]["plan"]) => void;
}) {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [criteria, setCriteria] = useState("");
  const [minutes, setMinutes] = useState(20);
  const [lessons, setLessons] = useState("");
  return (
    <details>
      <summary>Adicionar módulo</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add({
            title,
            objectives: [objective],
            criteria: [criteria],
            estimated_minutes: minutes,
            lesson_titles: lessons
              .split("\n")
              .map((t) => t.trim())
              .filter(Boolean),
          });
        }}
      >
        <label htmlFor="new-module">Título do novo módulo</label>
        <input
          id="new-module"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          required
        />
        <label htmlFor="new-module-goal">Objetivo do módulo</label>
        <input
          id="new-module-goal"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          maxLength={160}
          required
        />
        <label htmlFor="new-module-criteria">Critério de conclusão</label>
        <input
          id="new-module-criteria"
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          maxLength={160}
          required
        />
        <label htmlFor="new-module-minutes">Duração estimada em minutos</label>
        <input
          id="new-module-minutes"
          type="number"
          min={5}
          max={180}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          required
        />
        <label htmlFor="new-module-lessons">
          Títulos das aulas, um por linha
        </label>
        <textarea
          id="new-module-lessons"
          value={lessons}
          onChange={(e) => setLessons(e.target.value)}
          maxLength={960}
          required
        />
        <button
          disabled={
            busy ||
            !title.trim() ||
            !objective.trim() ||
            !criteria.trim() ||
            !lessons.trim()
          }
        >
          Adicionar ao plano
        </button>
      </form>
    </details>
  );
}
