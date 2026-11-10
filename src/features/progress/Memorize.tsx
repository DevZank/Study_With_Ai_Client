import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  api,
  flashcardViewSchema,
  formatPct,
  reviewEventSchema,
  reviewGradeViewSchema,
  type FlashcardView,
  type Rating,
} from "./api";

const ratingLabels: Record<Rating, string> = {
  1: "1 · Errei",
  2: "2 · Difícil",
  3: "3 · Bom",
  4: "4 · Fácil",
};

function CardHistory({ flashcardId }: { flashcardId: string }) {
  const [open, setOpen] = useState(false);
  const history = useQuery({
    queryKey: ["flashcard-history", flashcardId],
    queryFn: () =>
      api(
        "/flashcards/" + flashcardId + "/history",
        z.array(reviewEventSchema),
      ),
    enabled: open,
  });
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Histórico de revisões</summary>
      {history.isPending && <p role="status">Carregando histórico…</p>}
      {history.error && <p role="alert">{history.error.message}</p>}
      {history.data?.length === 0 && (
        <p>Nenhuma revisão registrada para este cartão.</p>
      )}
      {history.data && history.data.length > 0 && (
        <ul>
          {history.data.map((ev, i) => (
            <li key={ev.id}>
              Revisão {i + 1}: nota {ev.rating} · intervalo agendado:{" "}
              {ev.scheduled_days} d · estabilidade: {ev.stability_before} →{" "}
              {ev.stability_after} d
              {ev.xp_awarded > 0 ? ` · +${ev.xp_awarded} XP` : ""}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function FlashcardEditor({
  item,
  editable,
}: {
  item: FlashcardView;
  editable: boolean;
}) {
  const client = useQueryClient();
  const [front, setFront] = useState(item.card.front);
  const [back, setBack] = useState(item.card.back);
  const [concept, setConcept] = useState(item.card.concept_name);
  const pending = useRef<{ sig: string; id: string } | null>(null);
  const save = useMutation({
    mutationFn: (nextArchived: boolean) => {
      const payload = {
        front: front.trim(),
        back: back.trim(),
        concept_name: concept.trim(),
        archived: nextArchived,
        expected_version: item.card.version,
      };
      const sig = JSON.stringify(payload);
      if (pending.current?.sig !== sig)
        pending.current = { sig, id: crypto.randomUUID() };
      return api(
        "/flashcards/" + item.card.id,
        flashcardViewSchema,
        { ...payload, operation_id: pending.current.id },
        "PATCH",
      );
    },
    onSuccess: () => {
      pending.current = null;
      return Promise.all([
        client.invalidateQueries({ queryKey: ["flashcards"] }),
        client.invalidateQueries({ queryKey: ["reviews-due"] }),
        client.invalidateQueries({ queryKey: ["topic-progress"] }),
        client.invalidateQueries({ queryKey: ["progress-overview"] }),
      ]);
    },
  });

  return (
    <details>
      <summary>Editar cartão: {item.card.front.slice(0, 48)}</summary>
      {save.error && <p role="alert">{save.error.message}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(item.card.archived);
        }}
      >
        <label htmlFor={"front-" + item.card.id}>Frente do cartão</label>
        <textarea
          id={"front-" + item.card.id}
          value={front}
          onChange={(e) => setFront(e.target.value)}
          maxLength={4000}
          disabled={!editable || save.isPending}
          required
        />
        <label htmlFor={"back-" + item.card.id}>Verso do cartão</label>
        <textarea
          id={"back-" + item.card.id}
          value={back}
          onChange={(e) => setBack(e.target.value)}
          maxLength={4000}
          disabled={!editable || save.isPending}
          required
        />
        <label htmlFor={"concept-" + item.card.id}>Conceito do cartão</label>
        <input
          id={"concept-" + item.card.id}
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          maxLength={160}
          disabled={!editable || save.isPending}
          required
        />
        <div className="actions">
          <button
            disabled={
              !editable || save.isPending || !front.trim() || !back.trim()
            }
          >
            {save.isPending ? "Salvando…" : "Salvar alterações do cartão"}
          </button>
          <button
            type="button"
            disabled={!editable || save.isPending}
            onClick={() => save.mutate(!item.card.archived)}
          >
            {item.card.archived ? "Restaurar cartão" : "Arquivar cartão"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function Memorize({
  topicId,
  editable,
}: {
  topicId: string;
  editable: boolean;
}) {
  const client = useQueryClient();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [concept, setConcept] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [revealedId, setRevealedId] = useState("");
  const [lastFeedback, setLastFeedback] = useState("");
  const createOp = useRef<{ sig: string; id: string } | null>(null);
  const gradeOp = useRef<{ sig: string; id: string } | null>(null);

  const due = useQuery({
    queryKey: ["reviews-due", topicId],
    queryFn: () =>
      api(
        "/reviews/due?topic_id=" + encodeURIComponent(topicId),
        z.array(flashcardViewSchema),
      ),
  });
  const list = useQuery({
    queryKey: ["flashcards", topicId, showArchived],
    queryFn: () =>
      api(
        "/topics/" +
          topicId +
          "/flashcards?include_archived=" +
          String(showArchived),
        z.array(flashcardViewSchema),
      ),
  });

  const create = useMutation({
    mutationFn: () => {
      const payload = {
        front: front.trim(),
        back: back.trim(),
        concept_name: concept.trim(),
      };
      const sig = JSON.stringify(payload);
      if (createOp.current?.sig !== sig)
        createOp.current = { sig, id: crypto.randomUUID() };
      return api("/topics/" + topicId + "/flashcards", flashcardViewSchema, {
        ...payload,
        operation_id: createOp.current.id,
      });
    },
    onSuccess: async () => {
      setFront("");
      setBack("");
      setConcept("");
      createOp.current = null;
      await Promise.all([
        client.invalidateQueries({ queryKey: ["flashcards", topicId] }),
        client.invalidateQueries({ queryKey: ["reviews-due"] }),
        client.invalidateQueries({ queryKey: ["topic-progress", topicId] }),
        client.invalidateQueries({ queryKey: ["progress-overview"] }),
      ]);
    },
  });

  const grade = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: Rating }) => {
      const sig = id + ":" + String(rating);
      if (gradeOp.current?.sig !== sig)
        gradeOp.current = { sig, id: crypto.randomUUID() };
      return api("/reviews/" + id + "/grade", reviewGradeViewSchema, {
        rating,
        request_id: gradeOp.current.id,
      });
    },
    onSuccess: async (result) => {
      gradeOp.current = null;
      setRevealedId("");
      const xpNote =
        result.event.xp_awarded > 0
          ? ` · +${result.event.xp_awarded} XP registrado`
          : "";
      setLastFeedback(
        `Revisão registrada: próximo vencimento em ${result.event.scheduled_days} dia(s) · estabilidade FSRS ${result.review_state.stability} d${xpNote}.`,
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ["reviews-due"] }),
        client.invalidateQueries({ queryKey: ["flashcards", topicId] }),
        client.invalidateQueries({
          queryKey: ["flashcard-history", result.card.id],
        }),
        client.invalidateQueries({ queryKey: ["topic-progress", topicId] }),
        client.invalidateQueries({ queryKey: ["progress-overview"] }),
      ]);
    },
  });

  const currentDue = due.data?.[0];

  return (
    <section aria-label="Memorização e revisão espaçada">
      <h2>Memorização e revisão espaçada (FSRS)</h2>
      <p className="hint">
        O agendamento FSRS calcula estabilidade e dificuldade de forma
        determinística no seu computador. Você também pode importar cartões
        gerados pela IA no modo Memorizar.
      </p>
      {(due.error || list.error || create.error || grade.error) && (
        <p role="alert">
          {due.error?.message ||
            list.error?.message ||
            create.error?.message ||
            grade.error?.message}
        </p>
      )}
      {lastFeedback && <p role="status">{lastFeedback}</p>}

      <section className="flashcard" aria-label="Fila de revisão pendente">
        <h3>
          Fila de revisão agora ({due.data?.length ?? 0}{" "}
          {due.data?.length === 1 ? "cartão pendente" : "cartões pendentes"})
        </h3>
        {due.isPending && <p role="status">Verificando fila de revisão…</p>}
        {!due.isPending && !currentDue && (
          <p>
            Nenhum cartão vencido neste momento. Crie novos cartões ou volte
            quando o próximo agendamento vencer.
          </p>
        )}
        {currentDue && (
          <div>
            <p className="eyebrow">
              CONCEITO: {currentDue.card.concept_name} · REPETIÇÕES:{" "}
              {currentDue.review_state.reps}
            </p>
            <p>
              <strong>Frente:</strong> {currentDue.card.front}
            </p>
            {revealedId === currentDue.card.id ? (
              <>
                <p>
                  <strong>Verso:</strong> {currentDue.card.back}
                </p>
                <p className="hint">
                  Como foi sua recordação deste cartão? Sua escolha agenda o
                  próximo vencimento FSRS:
                </p>
                <div className="actions">
                  {([1, 2, 3, 4] as const).map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      className={rating === 3 ? "primary" : undefined}
                      disabled={!editable || grade.isPending}
                      onClick={() =>
                        grade.mutate({ id: currentDue.card.id, rating })
                      }
                    >
                      {ratingLabels[rating]}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button
                type="button"
                className="primary"
                onClick={() => setRevealedId(currentDue.card.id)}
              >
                Revelar resposta do cartão
              </button>
            )}
          </div>
        )}
      </section>

      <details>
        <summary>Criar flashcard</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <label htmlFor="new-card-front">Frente do cartão (pergunta)</label>
          <textarea
            id="new-card-front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            maxLength={4000}
            disabled={!editable || create.isPending}
            required
          />
          <label htmlFor="new-card-back">Verso do cartão (resposta)</label>
          <textarea
            id="new-card-back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            maxLength={4000}
            disabled={!editable || create.isPending}
            required
          />
          <label htmlFor="new-card-concept">
            Conceito relacionado (opcional)
          </label>
          <input
            id="new-card-concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            maxLength={160}
            placeholder="Ex.: Busca Binária"
            disabled={!editable || create.isPending}
          />
          <button
            className="primary"
            disabled={
              !editable || create.isPending || !front.trim() || !back.trim()
            }
          >
            {create.isPending ? "Adicionando…" : "Adicionar flashcard"}
          </button>
        </form>
      </details>

      <div className="actions">
        <label className="choice">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />{" "}
          Exibir cartões arquivados
        </label>
      </div>

      <h3>Cartões deste tema ({list.data?.length ?? 0})</h3>
      {list.isPending && <p role="status">Carregando cartões…</p>}
      {list.data?.length === 0 && (
        <p>Nenhum flashcard cadastrado neste tema.</p>
      )}
      <ol className="trail-modules">
        {list.data?.map((item) => (
          <li
            key={item.card.id + "-" + String(item.card.version)}
            className="trail-module"
          >
            <h4>
              {item.card.front}
              {item.card.archived ? " · arquivado" : ""}
            </h4>
            <p>
              <strong>Verso:</strong> {item.card.back}
            </p>
            <p className="hint">
              Conceito: {item.card.concept_name} · Origem:{" "}
              {item.card.source_type === "message_block"
                ? "Resposta da IA"
                : "Autoral"}{" "}
              · Estado FSRS: {item.review_state.state} · Repetições:{" "}
              {item.review_state.reps} · Lapsos: {item.review_state.lapses} ·
              Estabilidade: {item.review_state.stability} d · Dificuldade:{" "}
              {item.review_state.difficulty} · Retenção estimada:{" "}
              {formatPct(item.estimated_retention)} ·{" "}
              {item.due ? "Vencido para revisão" : "Em dia"} (vencimento:{" "}
              {item.review_state.due_at.slice(0, 16).replace("T", " ")} UTC)
            </p>
            <FlashcardEditor item={item} editable={editable} />
            <CardHistory flashcardId={item.card.id} />
          </li>
        ))}
      </ol>
    </section>
  );
}
