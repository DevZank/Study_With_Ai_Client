import { useRef, useState, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../lib/api";

export const exerciseSchema = z.object({
  id: z.string().uuid(),
  message_id: z.string().uuid(),
  kind: z.enum(["multiple_choice", "true_false", "fill_blank", "open"]),
  prompt: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })),
  hints: z.array(z.string()),
  hints_remaining: z.number().int().min(0),
  solution: z.string().nullable(),
  explanation: z.string().nullable(),
});
const attemptSchema = z.object({
  id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  response: z.string(),
  score: z.number().nullable(),
  feedback: z.string(),
  created_at: z.string(),
});

export function ExerciseCard({
  exerciseId,
  editable,
}: {
  exerciseId: string;
  editable: boolean;
}) {
  const client = useQueryClient();
  const [answer, setAnswer] = useState("");
  const name = useId();
  const pending = useRef<{ answer: string; id: string } | null>(null);
  const exercise = useQuery({
    queryKey: ["exercise", exerciseId],
    queryFn: () => api("/exercises/" + exerciseId, exerciseSchema),
  });
  const attempts = useQuery({
    queryKey: ["attempts", exerciseId],
    queryFn: () =>
      api("/exercises/" + exerciseId + "/attempts", z.array(attemptSchema)),
  });
  const submit = useMutation({
    mutationFn: () => {
      if (!pending.current || pending.current.answer !== answer.trim())
        pending.current = { answer: answer.trim(), id: crypto.randomUUID() };
      return api("/exercises/" + exerciseId + "/attempts", attemptSchema, {
        response: pending.current.answer,
        request_id: pending.current.id,
      });
    },
    onSuccess: () => {
      pending.current = null;
      return Promise.all([
        client.invalidateQueries({ queryKey: ["attempts", exerciseId] }),
        client.invalidateQueries({ queryKey: ["exercise", exerciseId] }),
        client.invalidateQueries({ queryKey: ["topic-progress"] }),
        client.invalidateQueries({ queryKey: ["progress-overview"] }),
      ]);
    },
  });
  const hint = useMutation({
    mutationFn: () =>
      api("/exercises/" + exerciseId + "/hints", exerciseSchema, {}),
    onSuccess: (data) => client.setQueryData(["exercise", exerciseId], data),
  });
  if (exercise.isPending) return <p role="status">Carregando exercício…</p>;
  if (exercise.error)
    return (
      <p role="alert">
        {exercise.error.message}
        <button
          onClick={() => {
            void exercise.refetch();
          }}
        >
          Tentar novamente
        </button>
      </p>
    );
  const item = exercise.data;
  if (!item) return null;
  const options =
    item.kind === "true_false"
      ? [
          { id: "true", text: "Verdadeiro" },
          { id: "false", text: "Falso" },
        ]
      : item.options;
  return (
    <section className="exercise-card" aria-label="Exercício">
      <h4>
        {item.kind === "open"
          ? "Questão aberta · revisão sem nota automática"
          : "Pratique antes de ver a solução"}
      </h4>
      <p>{item.prompt}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        {options.length ? (
          <fieldset disabled={!editable || submit.isPending}>
            <legend>Sua resposta</legend>
            {options.map((option) => (
              <label className="choice" key={option.id}>
                <input
                  type="radio"
                  name={name}
                  value={option.id}
                  checked={answer === option.id}
                  onChange={() => setAnswer(option.id)}
                  required
                />{" "}
                {option.text}
              </label>
            ))}
          </fieldset>
        ) : (
          <>
            <label htmlFor={name}>Sua resposta</label>
            <textarea
              id={name}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={4000}
              disabled={!editable || submit.isPending}
              required
            />
          </>
        )}
        <button disabled={!editable || !answer.trim() || submit.isPending}>
          {submit.isPending ? "Registrando…" : "Responder exercício"}
        </button>
      </form>
      {item.hints.map((text, i) => (
        <p className="hint" key={i}>
          Dica {i + 1}: {text}
        </p>
      ))}
      <button
        type="button"
        disabled={hint.isPending || item.hints_remaining === 0}
        onClick={() => hint.mutate()}
      >
        {hint.isPending
          ? "Abrindo dica…"
          : item.hints_remaining
            ? "Pedir próxima dica"
            : "Todas as dicas exibidas"}
      </button>
      {(submit.error || hint.error || attempts.error) && (
        <p role="alert">
          {submit.error?.message ||
            hint.error?.message ||
            attempts.error?.message}
        </p>
      )}
      <div aria-live="polite">
        {attempts.data?.map((attempt, i) => (
          <div className="attempt" key={attempt.id}>
            <strong>Tentativa {i + 1}</strong>
            <p>
              Sua resposta:{" "}
              {options.find((option) => option.id === attempt.response)?.text ||
                attempt.response}
            </p>
            <p>{attempt.feedback}</p>
          </div>
        ))}
      </div>
      {item.solution !== null && (
        <details>
          <summary>Ver referência após a tentativa</summary>
          <p>
            {options.find((o) => o.id === item.solution)?.text || item.solution}
          </p>
          <p>{item.explanation}</p>
        </details>
      )}
      <p className="hint">
        Questão e gabarito gerados por IA: podem conter erros. A correção
        objetiva compara sua resposta com esse gabarito, sem certificar domínio.
      </p>
    </section>
  );
}
