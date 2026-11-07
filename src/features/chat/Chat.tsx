import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  all,
  api,
  jobSchema,
  messageSchema,
  modelsSchema,
} from "../../lib/api";
import { useStream } from "./use-stream";

export function Chat({
  conversationId,
  editable,
}: {
  conversationId: string;
  editable: boolean;
}) {
  const client = useQueryClient();
  const [text, setText] = useState("");
  const [model, setModel] = useState("");
  const pending = useRef<{ content: string; model: string; id: string } | null>(
    null,
  );
  const models = useQuery({
    queryKey: ["models"],
    queryFn: () => api("/ai/models", modelsSchema),
    retry: false,
  });
  const jobs = useQuery({
    queryKey: ["jobs", conversationId],
    queryFn: () =>
      api("/conversations/" + conversationId + "/jobs", z.array(jobSchema)),
    refetchInterval: 3000,
  });
  const running = jobs.data?.find((j) => j.status === "running");
  const messages = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      all("/conversations/" + conversationId + "/messages", messageSchema),
    refetchInterval: running ? 2000 : false,
  });
  const streamError = useStream(running, conversationId);
  const send = useMutation({
    mutationFn: async () => {
      if (
        !pending.current ||
        pending.current.content !== text.trim() ||
        pending.current.model !== model
      )
        pending.current = {
          content: text.trim(),
          model,
          id: crypto.randomUUID(),
        };
      const request = pending.current;
      return api("/conversations/" + conversationId + "/messages", jobSchema, {
        content: request.content,
        model_id: request.model,
        request_id: request.id,
      });
    },
    onSuccess: async () => {
      setText("");
      pending.current = null;
      await Promise.all([
        client.invalidateQueries({ queryKey: ["topics"] }),
        client.invalidateQueries({ queryKey: ["messages", conversationId] }),
        client.invalidateQueries({ queryKey: ["jobs", conversationId] }),
      ]);
    },
  });
  const cancel = useMutation({
    mutationFn: () => api("/jobs/" + running?.id + "/cancel", jobSchema, {}),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ["jobs", conversationId] }),
        client.invalidateQueries({ queryKey: ["messages", conversationId] }),
      ]),
  });

  return (
    <section aria-label="Conversa">
      <div className="conversation-head">
        <div>
          <h2>Conversa livre</h2>
          <p>Ollama local · histórico salvo neste computador</p>
        </div>
        <button
          onClick={() => {
            void models.refetch();
          }}
        >
          Atualizar modelos
        </button>
      </div>
      {messages.isPending && <p role="status">Carregando histórico…</p>}
      {messages.error && (
        <p role="alert">
          {messages.error.message}{" "}
          <button
            onClick={() => {
              void messages.refetch();
            }}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {jobs.error && <p role="alert">{jobs.error.message}</p>}
      {!messages.isPending && messages.data?.length === 0 && (
        <div className="empty">
          <h3>Por onde vamos começar?</h3>
          <p>Escreva uma pergunta sobre este tema.</p>
        </div>
      )}
      <div className="messages" aria-label="Histórico">
        {messages.data?.map((message) => (
          <article key={message.id} className={"message " + message.role}>
            <header>
              {message.role === "user" ? "Você" : "Ollama"}{" "}
              {message.model_id && <span>· {message.model_id}</span>}
            </header>
            <p className="message-content">
              {message.content || "Aguardando o modelo…"}
            </p>
            {message.status !== "completed" && (
              <small>
                {
                  (
                    {
                      running: "Gerando… texto provisório",
                      cancelled: "Cancelada · texto parcial",
                      failed: "Falha · texto parcial",
                      interrupted: "Interrompida · texto parcial",
                    } as const
                  )[message.status]
                }
              </small>
            )}
          </article>
        ))}
      </div>
      {jobs.data
        ?.slice(-1)
        .filter((j) => j.error_message)
        .map((j) => (
          <p role="alert" key={j.id}>
            {j.error_message}
          </p>
        ))}
      {streamError && <p role="status">{streamError}</p>}
      {models.error && <p role="alert">{models.error.message}</p>}
      {models.data?.models.length === 0 && (
        <p role="status">
          Nenhum modelo local instalado. Instale um modelo pelo Ollama e
          atualize a lista.
        </p>
      )}
      {(send.error || cancel.error) && (
        <p role="alert">{send.error?.message || cancel.error?.message}</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send.mutate();
        }}
      >
        <label htmlFor="model">Modelo local</label>
        <select
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!!running || send.isPending}
        >
          <option value="">Selecione um modelo instalado</option>
          {models.data?.models.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <label htmlFor="prompt">Sua pergunta</label>
        <textarea
          id="prompt"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          rows={3}
          disabled={!editable || !!running || send.isPending}
          required
        />
        <p className="hint">
          Somente processamento local. Limite inicial: 30 mensagens e 12 mil
          caracteres por conversa; ao atingir o limite, crie outra conversa.
          Nenhuma pesquisa web é realizada.
        </p>
        {running ? (
          <button
            type="button"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? "Cancelando…" : "Cancelar resposta"}
          </button>
        ) : (
          <button
            className="primary"
            disabled={
              !editable ||
              !text.trim() ||
              !model ||
              send.isPending ||
              !models.data?.models.includes(model)
            }
          >
            {send.isPending ? "Enviando…" : "Enviar pergunta"}
          </button>
        )}
        <p role="status">
          {running
            ? "Gerando resposta local…"
            : send.isPending
              ? "Registrando pergunta…"
              : ""}
        </p>
      </form>
    </section>
  );
}
