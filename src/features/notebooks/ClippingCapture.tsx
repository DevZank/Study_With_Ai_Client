import { useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api, notebookSchema, pageSchema, sourceSchema } from "./api";
import type { NotePage } from "./api";

export function ClippingCapture({
  messageId,
  children,
}: {
  messageId: string;
  children: ReactNode;
}) {
  const area = useRef<HTMLDivElement>(null),
    pending = useRef(crypto.randomUUID());
  const createdPage = useRef<NotePage | null>(null);
  const [sourceStart, setSourceStart] = useState<number | null>(null);
  const [selected, setSelected] = useState(""),
    [open, setOpen] = useState(false),
    [notebook, setNotebook] = useState(""),
    [page, setPage] = useState(""),
    [title, setTitle] = useState(""),
    [saved, setSaved] = useState<{ id: string; notebook_id: string } | null>(
      null,
    );
  const source = useQuery({
    queryKey: ["clip-source", messageId],
    queryFn: () =>
      api("/messages/" + messageId + "/clipping-source", sourceSchema),
    enabled: open,
  });
  const books = useQuery({
    queryKey: ["notebooks"],
    queryFn: () => api("/notebooks", z.array(notebookSchema)),
    enabled: open,
  });
  const pages = useQuery({
    queryKey: ["clip-pages", notebook],
    queryFn: () =>
      api("/notebooks/" + notebook + "/pages", z.array(pageSchema)),
    enabled: open && !!notebook,
  });
  const capture = (event: SyntheticEvent) => {
    if (
      event.target instanceof Element &&
      event.target.closest("button,input,select,textarea")
    )
      return;
    const s = window.getSelection();
    if (
      s &&
      s.rangeCount &&
      area.current?.contains(s.getRangeAt(0).commonAncestorContainer) &&
      s.toString().trim()
    ) {
      const raw = s.toString(),
        range = s.getRangeAt(0);
      const pre = area.current?.querySelector(".clipping-text");
      if (pre?.contains(range.commonAncestorContainer)) {
        const prefix = range.cloneRange();
        prefix.selectNodeContents(pre);
        prefix.setEnd(range.startContainer, range.startOffset);
        setSourceStart(
          Array.from(
            prefix.toString() +
              raw.slice(0, raw.length - raw.trimStart().length),
          ).length,
        );
      } else setSourceStart(null);
      setSelected(raw.trim());
      pending.current = crypto.randomUUID();
    }
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!source.data) throw new Error("Aguarde a origem da resposta.");
      const offset = source.data.text.indexOf(selected);
      if (offset < 0 || !selected)
        throw new Error(
          "Selecione um trecho contínuo no texto para recorte abaixo. Elementos interativos não fazem parte da origem textual.",
        );
      let target =
        pages.data?.find((p) => p.id === page) ||
        (createdPage.current?.id === page ? createdPage.current : undefined);
      if (!target) {
        if (!title.trim())
          throw new Error(
            "Escolha uma página ou informe o título da nova página.",
          );
        target = await api("/notebooks/" + notebook + "/pages", pageSchema, {
          title,
        });
        createdPage.current = target;
        setPage(target.id);
      }
      const start =
        sourceStart ?? Array.from(source.data.text.slice(0, offset)).length;
      return api("/pages/" + target.id + "/clippings", pageSchema, {
        message_id: messageId,
        start,
        end: start + Array.from(selected).length,
        selected_text: selected,
        expected_version: target.version,
        operation_id: pending.current,
      });
    },
    onSuccess: (p) => {
      setSaved(p);
      setOpen(false);
      setSelected("");
    },
  });
  return (
    <div ref={area} onPointerUp={capture} onKeyUp={capture}>
      {children}
      {selected && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setOpen(true);
            setSaved(null);
          }}
        >
          Salvar no caderno
        </button>
      )}
      <button
        onClick={() => {
          setOpen(true);
          setSaved(null);
        }}
      >
        Selecionar trecho para o caderno
      </button>
      {saved && (
        <p role="status">
          Recorte salvo com origem.{" "}
          <a href={"#/notebooks/" + saved.notebook_id + "/pages/" + saved.id}>
            Abrir página
          </a>
        </p>
      )}
      {open && (
        <section
          className="clipping-panel"
          aria-label="Salvar recorte no caderno"
        >
          <h4>Salvar no caderno</h4>
          <p>
            Selecione texto da resposta. A cópia pode ser editada; sua origem
            original será preservada.
          </p>
          {source.isPending && <p role="status">Carregando origem…</p>}
          {source.error && <p role="alert">{source.error.message}</p>}
          {source.data && (
            <pre
              className="clipping-text"
              tabIndex={0}
              aria-label="Texto da resposta para recorte"
            >
              {source.data.text}
            </pre>
          )}
          <p>
            Trecho selecionado:{" "}
            {selected ||
              "Nenhum. Selecione com o mouse ou com Shift e as setas."}
          </p>
          {(books.error || pages.error || save.error) && (
            <p role="alert">
              {books.error?.message ||
                pages.error?.message ||
                save.error?.message}
            </p>
          )}
          {books.data?.length === 0 && (
            <p>Crie um caderno pelo menu Cadernos antes de salvar.</p>
          )}
          <label>
            Caderno de destino
            <select
              value={notebook}
              onChange={(e) => {
                setNotebook(e.target.value);
                setPage("");
              }}
            >
              <option value="">Selecione</option>
              {books.data?.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title} · {n.topic_id ? "tema" : "global"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Página de destino
            <select value={page} onChange={(e) => setPage(e.target.value)}>
              <option value="">Criar nova página</option>
              {pages.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          {!page && (
            <label>
              Título da página para o recorte
              <input
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          )}
          <button
            disabled={
              !notebook || !selected || save.isPending || source.isPending
            }
            onClick={() => save.mutate()}
          >
            Confirmar recorte
          </button>
          <button disabled={save.isPending} onClick={() => setOpen(false)}>
            Cancelar recorte
          </button>
        </section>
      )}
    </div>
  );
}
