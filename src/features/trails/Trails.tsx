import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { modelsSchema } from "../../lib/api";
import { api, all, trailSchema, trailViewSchema, trailJobSchema } from "./api";
import { UnitReader } from "./UnitReader";
import { ModuleEditor, AddModule } from "./ModuleEditor";

function initial() {
  const p = new URLSearchParams(location.hash.split("?")[1] || "");
  return {
    trail: p.get("trail") || "",
    unit: p.get("unit") || "",
    version: p.get("version") || "",
  };
}

export function Trails({
  topicId,
  editable,
}: {
  topicId: string;
  editable: boolean;
}) {
  const client = useQueryClient();
  const [selection, setSelection] = useState(initial);
  const [objective, setObjective] = useState("");
  const [prior, setPrior] = useState("");
  const [preferences, setPreferences] = useState("");
  const [count, setCount] = useState(5);
  const [model, setModel] = useState("");
  const [title, setTitle] = useState("");
  const [submittedJob, setSubmittedJob] = useState("");
  const handled = useRef("");
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const choose = (value: ReturnType<typeof initial>) => {
    setSelection(value);
    const p = new URLSearchParams({
      view: "trails",
      trail: value.trail,
      unit: value.unit,
      version: value.version,
    });
    history.replaceState(
      null,
      "",
      location.pathname +
        location.search +
        location.hash.split("?")[0] +
        "?" +
        p.toString(),
    );
  };
  const models = useQuery({
    queryKey: ["models"],
    queryFn: () => api("/ai/models", modelsSchema),
  });
  const list = useQuery({
    queryKey: ["trails", topicId],
    queryFn: () => all("/topics/" + topicId + "/trails", trailSchema),
  });
  const detail = useQuery({
    queryKey: ["trail", selection.trail],
    queryFn: () => api("/trails/" + selection.trail, trailViewSchema),
    enabled: !!selection.trail,
  });
  const jobs = useQuery({
    queryKey: ["trail-jobs", topicId],
    queryFn: () =>
      api("/topics/" + topicId + "/trail-jobs", z.array(trailJobSchema)),
    refetchInterval: 1500,
  });
  const observed = useQuery({
    queryKey: ["trail-job", submittedJob],
    queryFn: () => api("/trail-jobs/" + submittedJob, trailJobSchema),
    enabled: !!submittedJob,
    refetchInterval: (q) => (q.state.data?.status === "running" ? 700 : false),
  });
  const active =
    jobs.data?.find((j) => j.status === "running") ||
    (observed.data?.status === "running" ? observed.data : undefined);
  const execute = useMutation({
    mutationFn: ({
      path,
      body,
    }: {
      path: string;
      body: Record<string, unknown>;
    }) => {
      const signature = JSON.stringify([path, body]);
      if (pending.current?.signature !== signature)
        pending.current = { signature, id: crypto.randomUUID() };
      return api(path, trailJobSchema, {
        ...body,
        request_id: pending.current.id,
      });
    },
    onSuccess: (job) => {
      client.setQueryData(["trail-job", job.id], job);
      setSubmittedJob(job.id);
      void client.invalidateQueries({ queryKey: ["trail-jobs"] });
    },
  });
  useEffect(() => {
    const job = observed.data || jobs.data?.at(-1);
    if (!job || job.status === "running" || handled.current === job.id) return;
    handled.current = job.id;
    pending.current = null;
    if (job.status === "completed") {
      if (job.kind === "plan" && (submittedJob === job.id || !selection.trail))
        choose({ trail: job.result_id, unit: "", version: "" });
      if (
        job.kind === "unit" &&
        submittedJob === job.id &&
        selection.unit === job.target_id
      )
        choose({ ...selection, version: job.result_id });
    }
    void client.invalidateQueries({ queryKey: ["trails"] });
    void client.invalidateQueries({ queryKey: ["trail"] });
    void client.invalidateQueries({ queryKey: ["trail-version"] });
    void client.invalidateQueries({ queryKey: ["trail-jobs"] });
  }, [
    observed.data?.id,
    observed.data?.status,
    jobs.data?.at(-1)?.id,
    jobs.data?.at(-1)?.status,
  ]);
  useEffect(() => {
    if (detail.data) setTitle(detail.data.trail.title);
  }, [detail.data?.trail.id]);
  const edit = useMutation({
    mutationFn: ({
      path,
      body,
      method = "PATCH",
    }: {
      path: string;
      body: Record<string, unknown>;
      method?: string;
    }) => api(path, trailViewSchema, body, method),
    onSuccess: (value) => {
      client.setQueryData(["trail", value.trail.id], value);
      void client.invalidateQueries({ queryKey: ["trails"] });
    },
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      api("/trail-jobs/" + id + "/cancel", trailJobSchema, {}),
    onSuccess: (job) => {
      client.setQueryData(["trail-job", job.id], job);
      void client.invalidateQueries({ queryKey: ["trail-jobs"] });
    },
  });
  const busy = !!active || execute.isPending || edit.isPending || !editable;
  const trail = detail.data;
  const activeModules = trail?.modules.filter((m) => !m.module.archived) || [];
  const selectedModule = activeModules.find((m) =>
    m.units.some((u) => u.unit.id === selection.unit),
  );
  const selectedUnit = selectedModule?.units.find(
    (u) => u.unit.id === selection.unit,
  );
  const change = (
    path: string,
    body: Record<string, unknown>,
    method = "PATCH",
  ) =>
    edit.mutate({
      path,
      method,
      body: { expected_version: trail?.trail.version, ...body },
    });
  const error =
    execute.error ||
    edit.error ||
    cancel.error ||
    models.error ||
    list.error ||
    detail.error ||
    jobs.error ||
    observed.error;
  const lastJob = observed.data || jobs.data?.at(-1);

  return (
    <section aria-label="Trilhas guiadas">
      <h2>Trilhas guiadas</h2>
      <p>
        Planeje primeiro. O conteúdo será criado somente quando você solicitar
        cada unidade.
      </p>
      <label htmlFor="trail-model">Modelo local para a trilha</label>
      <select
        id="trail-model"
        value={model}
        disabled={busy}
        onChange={(e) => setModel(e.target.value)}
      >
        <option value="">Selecione um modelo instalado</option>
        {models.data?.models.map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
      <button
        onClick={() => {
          void models.refetch();
        }}
        disabled={!!active}
      >
        Atualizar modelos da trilha
      </button>
      {models.data?.models.length === 0 && (
        <p role="status">Nenhum modelo local instalado.</p>
      )}
      {error && <p role="alert">{error.message}</p>}
      {lastJob &&
        ["failed", "interrupted", "cancelled"].includes(lastJob.status) && (
          <p role={lastJob.status === "failed" ? "alert" : "status"}>
            {lastJob.error_message ||
              "Operação cancelada; versões anteriores preservadas."}
          </p>
        )}
      {active && (
        <p role="status">
          Operação em andamento:{" "}
          {active.kind === "plan"
            ? "planejando trilha"
            : active.kind === "unit"
              ? "gerando uma unidade"
              : "criando resumo"}
          .{" "}
          <button
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(active.id)}
          >
            Cancelar operação da trilha
          </button>
        </p>
      )}
      <details>
        <summary>Criar trilha</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            execute.mutate({
              path: "/trails/plan",
              body: {
                topic_id: topicId,
                objective,
                prior_knowledge: prior,
                preferences,
                module_count: count,
                model_id: model,
              },
            });
          }}
        >
          <label htmlFor="trail-goal">Objetivo de aprendizagem</label>
          <textarea
            id="trail-goal"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            maxLength={4000}
            required
          />
          <label htmlFor="trail-prior">Conhecimento prévio</label>
          <input
            id="trail-prior"
            value={prior}
            onChange={(e) => setPrior(e.target.value)}
            maxLength={1000}
          />
          <label htmlFor="trail-preferences">
            Disponibilidade e profundidade desejada
          </label>
          <input
            id="trail-preferences"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            maxLength={1000}
          />
          <label htmlFor="trail-count">Quantidade de módulos</label>
          <input
            id="trail-count"
            type="number"
            min={1}
            max={8}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            required
          />
          <button
            className="primary"
            disabled={busy || !model || !objective.trim()}
          >
            Gerar somente o plano
          </button>
        </form>
      </details>
      {list.isPending && <p role="status">Carregando trilhas…</p>}
      {list.data?.length === 0 && <p>Nenhuma trilha neste tema.</p>}
      <nav className="tabs" aria-label="Trilhas deste tema">
        {list.data?.map((t) => (
          <button
            key={t.id}
            aria-pressed={selection.trail === t.id}
            onClick={() => {
              choose({ trail: t.id, unit: "", version: "" });
              setTitle(t.title);
            }}
          >
            {t.title}
          </button>
        ))}
      </nav>
      {detail.isPending && selection.trail && (
        <p role="status">Abrindo plano…</p>
      )}
      {trail && (
        <>
          <h3>{trail.trail.title}</h3>
          <p>{trail.trail.objective}</p>
          <p>
            Pré-requisitos:{" "}
            {trail.trail.prerequisites.join(", ") || "Nenhum informado."}
          </p>
          <p role="status">
            Conclusão informada: {trail.completed_units} de {trail.total_units}{" "}
            unidades (indicador separado de domínio e retenção estimados).
          </p>
          <details>
            <summary>Renomear trilha</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                change("/trails/" + trail.trail.id, { title });
              }}
            >
              <label htmlFor="trail-title">Título da trilha</label>
              <input
                id="trail-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
              />
              <button disabled={busy || !title.trim()}>Salvar título</button>
            </form>
          </details>
          <ol className="trail-modules">
            {trail.modules.map((item) => (
              <li key={item.module.id} className="trail-module">
                <h4>
                  {item.module.plan.title}
                  {item.module.archived ? " · arquivado" : ""}
                </h4>
                <p>Objetivos: {item.module.plan.objectives.join("; ")}</p>
                <p>Critérios: {item.module.plan.criteria.join("; ")}</p>
                <p>
                  Organização automática:{" "}
                  {item.module.granularity === "lesson"
                    ? "aulas menores"
                    : "módulo curto"}
                  . Duração estimada pelo plano:{" "}
                  {item.module.plan.estimated_minutes} min.
                </p>
                {!item.module.archived && (
                  <>
                    <button
                      onClick={() =>
                        choose({
                          ...selection,
                          unit: item.units[0].unit.id,
                          version: "",
                        })
                      }
                    >
                      Abrir módulo
                    </button>
                    {item.units.map((u) => (
                      <button
                        key={u.unit.id}
                        aria-pressed={selection.unit === u.unit.id}
                        onClick={() =>
                          choose({ ...selection, unit: u.unit.id, version: "" })
                        }
                      >
                        {u.unit.title} ·{" "}
                        {u.summaries.length
                          ? "concluída"
                          : u.versions.length
                            ? "gerada"
                            : "não gerada"}
                      </button>
                    ))}
                    <div className="actions">
                      {["up", "down"].map((direction) => (
                        <button
                          key={direction}
                          disabled={
                            busy ||
                            (direction === "up"
                              ? activeModules[0]?.module.id === item.module.id
                              : activeModules.at(-1)?.module.id ===
                                item.module.id)
                          }
                          onClick={() => {
                            const ids = activeModules.map((m) => m.module.id),
                              i = ids.indexOf(item.module.id),
                              j = i + (direction === "up" ? -1 : 1);
                            [ids[i], ids[j]] = [ids[j], ids[i]];
                            change(
                              "/trails/" + trail.trail.id + "/modules/order",
                              { module_ids: ids },
                            );
                          }}
                        >
                          {direction === "up"
                            ? "Mover para cima"
                            : "Mover para baixo"}
                          : {item.module.plan.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <ModuleEditor
                  key={item.module.id + "-" + trail.trail.version}
                  item={item}
                  busy={busy}
                  save={(plan) =>
                    change("/modules/" + item.module.id, { plan })
                  }
                />
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      item.module.archived ||
                      window.confirm(
                        "Arquivar este módulo? Conteúdo, versões e progresso serão preservados.",
                      )
                    )
                      change("/modules/" + item.module.id, {
                        archived: !item.module.archived,
                      });
                  }}
                >
                  {item.module.archived
                    ? "Restaurar módulo"
                    : "Arquivar módulo"}
                  : {item.module.plan.title}
                </button>
              </li>
            ))}
          </ol>
          <AddModule
            busy={busy || activeModules.length >= 8}
            add={(plan) =>
              change("/trails/" + trail.trail.id + "/modules", { plan }, "POST")
            }
          />
          {selectedUnit && selectedModule && (
            <UnitReader
              key={selectedUnit.unit.id}
              item={selectedUnit}
              versionId={selection.version}
              selectVersion={(version) => choose({ ...selection, version })}
              model={model}
              busy={busy}
              editable={editable}
              generate={(force) =>
                execute.mutate({
                  path: "/modules/" + selectedModule.module.id + "/generate",
                  body: {
                    unit_id: selectedUnit.unit.id,
                    force_regenerate: force,
                    model_id: model,
                  },
                })
              }
              complete={(version, difficulties) =>
                execute.mutate({
                  path: "/units/" + selectedUnit.unit.id + "/complete",
                  body: { version_id: version, difficulties, model_id: model },
                })
              }
            />
          )}
        </>
      )}
    </section>
  );
}
