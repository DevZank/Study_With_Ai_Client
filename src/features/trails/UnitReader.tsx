import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Blocks } from "../content/Blocks";
import { ClippingCapture } from "../notebooks/ClippingCapture";
import { api, versionViewSchema, contextSchema, type UnitView } from "./api";

export function UnitReader({
  item,
  versionId,
  selectVersion,
  model,
  busy,
  editable,
  generate,
  complete,
}: {
  item: UnitView;
  versionId: string;
  selectVersion: (id: string) => void;
  model: string;
  busy: boolean;
  editable: boolean;
  generate: (force: boolean) => void;
  complete: (versionId: string, difficulties: string) => void;
}) {
  const [difficulties, setDifficulties] = useState("");
  const selected =
    item.versions.find((v) => v.id === versionId) || item.versions.at(-1);
  const result = useQuery({
    queryKey: ["trail-version", item.unit.id, selected?.id],
    queryFn: () =>
      api(
        "/units/" + item.unit.id + "/versions/" + selected?.id,
        versionViewSchema,
      ),
    enabled: !!selected,
  });
  let continuity: ReturnType<typeof contextSchema.safeParse> | undefined;
  try {
    continuity = contextSchema.safeParse(
      JSON.parse(result.data?.version.context || "{}") as unknown,
    );
  } catch {
    continuity = undefined;
  }
  return (
    <section aria-label="Unidade da trilha">
      <h3>{item.unit.title}</h3>
      {!selected ? (
        <>
          <p>
            Esta unidade ainda não foi gerada. As próximas também permanecem sem
            conteúdo.
          </p>
          <button
            className="primary"
            disabled={busy || !editable || !model}
            onClick={() => generate(false)}
          >
            Gerar e abrir unidade
          </button>
        </>
      ) : (
        <>
          <label htmlFor="content-version">Versão do conteúdo</label>
          <select
            id="content-version"
            value={selected.id}
            onChange={(e) => selectVersion(e.target.value)}
          >
            {item.versions.map((v) => (
              <option key={v.id} value={v.id}>
                Versão {v.number} · plano {v.plan_version}
              </option>
            ))}
          </select>
          {result.isPending && <p role="status">Carregando conteúdo…</p>}
          {result.error && (
            <p role="alert">
              {result.error.message}
              <button
                onClick={() => {
                  void result.refetch();
                }}
              >
                Tentar novamente
              </button>
            </p>
          )}
          {result.data && (
            <>
              {result.data.stale && (
                <p role="status">
                  O plano ou os resumos de contexto mudaram. Esta versão foi
                  preservada; uma atualização exige gerar nova versão.
                </p>
              )}
              <p className="hint">
                Objetivos e critérios estão no módulo. Concluir informa sua
                atividade, sem certificar domínio ou retenção.
              </p>
              <ClippingCapture messageId={result.data.message.id}>
                <Blocks
                  value={result.data.message.document}
                  editable={editable}
                  messageId={result.data.message.id}
                />
              </ClippingCapture>
              <details>
                <summary>Continuidade usada nesta versão</summary>
                <p>
                  Somente resumos anteriores selecionados; o histórico bruto de
                  conversa não foi usado.
                </p>
                {continuity?.success ? (
                  <>
                    {continuity.data.previous_summaries.length === 0 && (
                      <p>Sem resumos anteriores disponíveis nesta geração.</p>
                    )}
                    {continuity.data.previous_summaries.map((s) => (
                      <section key={s.summary_id}>
                        <p>Conceitos anteriores: {s.concepts.join(", ")}</p>
                        <ul>
                          {s.conclusions.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                        <p>
                          Dificuldades informadas anteriormente:{" "}
                          {s.difficulties || "Nenhuma."}
                        </p>
                      </section>
                    ))}
                    {continuity.data.omitted_summaries > 0 && (
                      <p>
                        Outros resumos ficaram fora desta geração para manter o
                        contexto limitado.
                      </p>
                    )}
                  </>
                ) : (
                  <p>Não foi possível apresentar o contexto desta versão.</p>
                )}
              </details>
              {result.data.summaries.length ? (
                result.data.summaries.map((s) => (
                  <section key={s.id} className="learning-summary">
                    <h4>Resumo de conclusão</h4>
                    <p>
                      <strong>Conceitos:</strong>{" "}
                      {s.content.concepts.join(", ")}
                    </p>
                    <ul>
                      {s.content.conclusions.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                    <p>
                      <strong>Dificuldades informadas:</strong>{" "}
                      {s.difficulties || "Nenhuma informada."}
                    </p>
                    <p>
                      Tentativas objetivas: {s.objective_attempts}; respostas de
                      acordo com o gabarito: {s.matching_answers}. Domínio e
                      retenção não estimados.
                    </p>
                    <p>
                      <strong>Próximos passos sugeridos:</strong>{" "}
                      {s.content.next_steps.join(" ")}
                    </p>
                  </section>
                ))
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    complete(selected.id, difficulties);
                  }}
                >
                  <label htmlFor="learning-difficulties">
                    Dificuldades que você identificou (opcional)
                  </label>
                  <textarea
                    id="learning-difficulties"
                    value={difficulties}
                    onChange={(e) => setDifficulties(e.target.value)}
                    maxLength={1000}
                  />
                  <button disabled={busy || !editable || !model}>
                    Concluir unidade e gerar resumo
                  </button>
                </form>
              )}
            </>
          )}
          <button
            disabled={busy || !editable || !model}
            onClick={() => generate(false)}
          >
            Abrir versão em cache
          </button>{" "}
          <button
            disabled={busy || !editable || !model}
            onClick={() => {
              if (
                window.confirm(
                  "Gerar uma nova versão? A atual, suas tentativas e seu resumo serão preservados.",
                )
              )
                generate(true);
            }}
          >
            Gerar nova versão
          </button>
        </>
      )}
    </section>
  );
}
