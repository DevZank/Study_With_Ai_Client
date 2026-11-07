import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { parseStream, type Job, type Message } from "../../lib/api";

export function useStream(job: Job | undefined, conversationId: string) {
  const client = useQueryClient();
  const [streamError, setStreamError] = useState("");

  useEffect(() => {
    setStreamError("");
    if (!job || job.status !== "running") return;
    const source = new EventSource("/api/v1/jobs/" + job.id + "/events");
    const receive = (event: MessageEvent<string>) => {
      const parsed = parseStream(event.data);
      if (
        !parsed.success ||
        parsed.data.job_id !== job.id ||
        parsed.data.message.conversation_id !== conversationId
      ) {
        setStreamError(
          "Evento inválido. O histórico será atualizado pela API.",
        );
        source.close();
        return;
      }
      const { message, job: current } = parsed.data;
      client.setQueryData<Message[]>(
        ["messages", conversationId],
        (old = []) =>
          old.some((m) => m.id === message.id)
            ? old.map((m) => (m.id === message.id ? message : m))
            : [...old, message],
      );
      if (current.status !== "running") {
        source.close();
        void client.invalidateQueries({ queryKey: ["jobs", conversationId] });
        void client.invalidateQueries({
          queryKey: ["messages", conversationId],
        });
      }
    };
    for (const name of [
      "job.started",
      "generation.delta",
      "job.completed",
      "job.failed",
      "job.cancelled",
      "job.interrupted",
    ])
      source.addEventListener(name, receive as EventListener);
    source.onerror = () =>
      setStreamError(
        "Transmissão interrompida. Reconectando; o texto salvo continua disponível.",
      );
    source.onopen = () => setStreamError("");
    return () => source.close();
  }, [job?.id, job?.status, conversationId, client]);
  return streamError;
}
