import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  api,
  flashcardViewSchema,
  formatPct,
  overviewSchema,
  preferenceSchema,
  topicProgressSchema,
  type Gamification,
} from "./api";

const uncertaintyLabels: Record<string, string> = {
  unestimated: "Sem evidências avaliadas",
  high: "Incerteza alta (poucas evidências)",
  moderate: "Incerteza moderada",
  low: "Incerteza baixa (evidências consistentes)",
};

export function GamificationSection({ data }: { data: Gamification }) {
  const client = useQueryClient();
  const toggle = useMutation({
    mutationFn: (hide: boolean) =>
      api(
        "/progress/preferences",
        preferenceSchema,
        { hide_gamification: hide },
        "PATCH",
      ),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ["topic-progress"] }),
        client.invalidateQueries({ queryKey: ["progress-overview"] }),
      ]),
  });

  return (
    <section className="trail-module" aria-label="Gamificação leve">
      <div className="conversation-head">
        <div>
          <h3>Gamificação leve</h3>
          <p className="hint">{data.anti_farming_policy}</p>
        </div>
        <button
          type="button"
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(!data.hide_gamification)}
        >
          {data.hide_gamification
            ? "Exibir gamificação"
            : "Ocultar gamificação"}
        </button>
      </div>
      {toggle.error && <p role="alert">{toggle.error.message}</p>}
      {data.hide_gamification ? (
        <p role="status">
          Os indicadores de XP, níveis e conquistas estão ocultos conforme sua
          preferência.
        </p>
      ) : (
        <>
          <p>
            <strong>Nível {data.level}</strong> · {data.total_xp} XP acumulado (
            {data.current_level_xp} / {data.next_level_xp} XP no nível atual)
          </p>
          <h4>Conquistas</h4>
          <ul>
            {data.achievements.map((a) => (
              <li key={a.code}>
                <strong>{a.title}</strong> — {a.description} ·{" "}
                <span>{a.earned ? "Conquistada" : "Pendente"}</span>
              </li>
            ))}
          </ul>
          {data.recent_xp_events.length > 0 && (
            <details>
              <summary>
                Registro recente de XP ({data.recent_xp_events.length})
              </summary>
              <ul>
                {data.recent_xp_events.map((ev) => (
                  <li key={ev.id}>
                    +{ev.points} XP · {ev.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

export function TopicProgressPanel({ topicId }: { topicId: string }) {
  const progress = useQuery({
    queryKey: ["topic-progress", topicId],
    queryFn: () => api("/progress/topics/" + topicId, topicProgressSchema),
  });

  if (progress.isPending)
    return <p role="status">Calculando métricas pedagógicas…</p>;
  if (progress.error) return <p role="alert">{progress.error.message}</p>;
  const data = progress.data;
  if (!data) return null;

  return (
    <section aria-label="Progresso e métricas pedagógicas">
      <h2>Progresso e métricas pedagógicas</h2>
      <p className="hint">
        Conclusão, domínio estimado e retenção estimada são indicadores
        independentes, calculados a partir de eventos reais salvos neste
        computador. Estimativas não constituem prova absoluta de aprendizado.
      </p>

      <div className="metrics-grid">
        <article className="trail-module" aria-label="Indicador de conclusão">
          <p className="eyebrow">1 · CONCLUSÃO DE ATIVIDADES</p>
          <h3>
            {data.completion.completed_units} de {data.completion.total_units}{" "}
            unidades ({formatPct(data.completion.completion_ratio)})
          </h3>
          <p>
            Unidades geradas: {data.completion.generated_units} · Trilhas no
            tema: {data.completion.trails.length}
          </p>
          {data.completion.trails.length > 0 && (
            <ul>
              {data.completion.trails.map((t) => (
                <li key={t.trail_id}>
                  <strong>{t.title}</strong>: {t.completed_units} de{" "}
                  {t.total_units} concluídas ({formatPct(t.completion_ratio)})
                </li>
              ))}
            </ul>
          )}
          <p className="hint">{data.explanations.completion}</p>
        </article>

        <article className="trail-module" aria-label="Indicador de domínio">
          <p className="eyebrow">2 · DOMÍNIO ESTIMADO POR CONCEITO</p>
          <h3>{formatPct(data.mastery.estimated_score)}</h3>
          <p>
            Conceitos com evidência avaliada: {data.mastery.evaluated_concepts}{" "}
            de {data.mastery.total_concepts}
          </p>
          <p className="hint">{data.explanations.mastery}</p>
        </article>

        <article className="trail-module" aria-label="Indicador de retenção">
          <p className="eyebrow">3 · RETENÇÃO ESTIMADA (FSRS)</p>
          <h3>{formatPct(data.retention.estimated_retention)}</h3>
          <p>
            Cartões revisados: {data.retention.reviewed_cards} de{" "}
            {data.retention.active_cards} ativos · Vencidos agora:{" "}
            {data.retention.due_cards}
          </p>
          <p className="hint">{data.explanations.retention}</p>
        </article>
      </div>

      <section
        className="trail-module"
        aria-label="Domínio detalhado por conceito"
      >
        <h3>Domínio por conceito ({data.mastery.concepts.length})</h3>
        {data.mastery.concepts.length === 0 ? (
          <p>
            Nenhum conceito registrado ainda. Pratique exercícios, crie
            flashcards ou conclua unidades de trilha para gerar evidências.
          </p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Conceito</th>
                  <th scope="col">Domínio estimado</th>
                  <th scope="col">Tentativas objetivas</th>
                  <th scope="col">Acertos</th>
                  <th scope="col">Revisões FSRS</th>
                  <th scope="col">Grau de incerteza</th>
                </tr>
              </thead>
              <tbody>
                {data.mastery.concepts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.concept_name}</td>
                    <td>{formatPct(c.score)}</td>
                    <td>{c.objective_attempts}</td>
                    <td>{c.correct_attempts}</td>
                    <td>{c.review_count}</td>
                    <td>{uncertaintyLabels[c.uncertainty] || c.uncertainty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="trail-module" aria-label="Sugestões pedagógicas">
        <h3>Próximos passos sugeridos</h3>
        <p className="hint">
          Sugestões calculadas a partir dos seus registros locais; você decide
          quando e como avançar.
        </p>
        <ul>
          {data.recommendations.map((rec, i) => (
            <li key={i}>
              <strong>{rec.title}:</strong> {rec.description}
            </li>
          ))}
        </ul>
      </section>

      <GamificationSection data={data.gamification} />
    </section>
  );
}

export function GlobalProgress() {
  const overview = useQuery({
    queryKey: ["progress-overview"],
    queryFn: () => api("/progress/overview", overviewSchema),
  });
  const due = useQuery({
    queryKey: ["reviews-due", "all"],
    queryFn: () => api("/reviews/due", z.array(flashcardViewSchema)),
  });

  return (
    <section aria-label="Visão geral de revisões e progresso">
      <div className="topic-head">
        <div>
          <p className="eyebrow">ACOMPANHAMENTO LOCAL</p>
          <h1>Revisões e progresso</h1>
        </div>
        <a href="#/">Visão geral</a>
      </div>
      {(overview.error || due.error) && (
        <p role="alert">{overview.error?.message || due.error?.message}</p>
      )}
      {overview.isPending && <p role="status">Carregando visão geral…</p>}
      {overview.data && (
        <>
          <section className="trail-module" aria-label="Resumo global">
            <h2>Fila global de revisão espaçada</h2>
            <p>
              Cartões vencidos em temas ativos:{" "}
              <strong>{overview.data.due_count}</strong> · Temas ativos:{" "}
              <strong>{overview.data.active_topics_count}</strong>
            </p>
            {due.data && due.data.length > 0 && (
              <ul>
                {due.data.map((item) => (
                  <li key={item.card.id}>
                    <strong>{item.card.front}</strong> ({item.card.concept_name}
                    ) —{" "}
                    <a
                      href={"#/topics/" + item.card.topic_id + "?view=memorize"}
                    >
                      Abrir revisão no tema
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <GamificationSection data={overview.data.gamification} />
        </>
      )}
    </section>
  );
}
