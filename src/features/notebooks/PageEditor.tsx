import { lazy, Suspense, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  api,
  pageSchema,
  pageValue,
  clippingSchema,
  drawingSchema,
  type NotePage,
  type Notebook,
  type Folder,
  type PageValue,
} from "./api";
import { topicSchema } from "../../lib/api";
import { RichEditor } from "./RichEditor";
import { useAutosave } from "./use-autosave";
const DrawingBoard = lazy(() =>
  import("./DrawingBoard").then((m) => ({ default: m.DrawingBoard })),
);
const valueSchema = pageSchema.omit({
  id: true,
  version: true,
  updated_at: true,
});

export function PageEditor({
  page,
  notebooks,
  folders,
}: {
  page: NotePage;
  notebooks: Notebook[];
  folders: Folder[];
}) {
  const client = useQueryClient(),
    [showDrawing, setShowDrawing] = useState(false),
    [link, setLink] = useState("");
  const a = useAutosave<PageValue>(
    "study:page:" + page.id,
    pageValue(page),
    page.version,
    valueSchema,
    async (value, version, id) => {
      const saved = await api(
        "/pages/" + page.id,
        pageSchema,
        { ...value, expected_version: version, operation_id: id },
        "PATCH",
      );
      void client.invalidateQueries({ queryKey: ["note-pages"] });
      return saved;
    },
  );
  const topics = useQuery({
    queryKey: ["note-topics"],
    queryFn: () =>
      api("/topics?limit=100", z.object({ items: z.array(topicSchema) })),
  });
  const clips = useQuery({
    queryKey: ["note-clips", page.id],
    queryFn: () =>
      api("/pages/" + page.id + "/clippings", z.array(clippingSchema)),
  });
  const drawing = useQuery({
    queryKey: ["drawing", page.id],
    queryFn: () => api("/pages/" + page.id + "/drawing", drawingSchema),
    enabled: showDrawing,
  });
  const versions = useQuery({
    queryKey: ["note-revisions", page.id],
    queryFn: () =>
      api(
        "/pages/" + page.id + "/revisions",
        z.array(z.object({ id: z.string(), snapshot: pageSchema })),
      ),
    enabled: !a.dirty,
  });
  const set = (patch: Partial<PageValue>) => a.update({ ...a.value, ...patch });
  if (!a.ready) return <p role="status">Recuperando página…</p>;
  return (
    <section aria-label="Página do caderno">
      <h2>{a.value.title || "Página sem título"}</h2>
      <p role="status">{a.status}</p>
      {a.error && (
        <p role="alert">
          {a.error}
          <button onClick={a.retry}>Tentar salvar página</button>
          <button onClick={a.exportDraft}>Exportar rascunho da página</button>
          <button onClick={a.reload}>Recarregar página do banco</button>
        </p>
      )}
      <label htmlFor="page-title">Título da página</label>
      <input
        id="page-title"
        value={a.value.title}
        maxLength={120}
        onChange={(e) => set({ title: e.target.value })}
      />
      <RichEditor
        value={a.value.document}
        onChange={(document) => set({ document })}
      />
      <details>
        <summary>Organizar página e vínculos</summary>
        <label htmlFor="page-book">Mover para caderno</label>
        <select
          id="page-book"
          value={a.value.notebook_id}
          onChange={(e) =>
            set({ notebook_id: e.target.value, folder_id: null })
          }
        >
          {notebooks.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
        </select>
        <label htmlFor="page-folder">Pasta da página</label>
        <select
          id="page-folder"
          value={a.value.folder_id || ""}
          onChange={(e) => set({ folder_id: e.target.value || null })}
        >
          <option value="">Sem pasta</option>
          {folders
            .filter((f) => f.notebook_id === a.value.notebook_id)
            .map((f) => (
              <option value={f.id} key={f.id}>
                {f.title}
              </option>
            ))}
        </select>
        <label htmlFor="page-tags">Tags separadas por vírgula</label>
        <input
          id="page-tags"
          value={a.value.tags.join(",")}
          onChange={(e) =>
            set({
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
        />
        <label htmlFor="page-topics">
          Temas relacionados (Ctrl para selecionar vários)
        </label>
        <select
          multiple
          id="page-topics"
          value={a.value.topic_ids}
          onChange={(e) =>
            set({
              topic_ids: Array.from(e.target.selectedOptions, (o) => o.value),
            })
          }
        >
          {topics.data?.items.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <label htmlFor="page-link">Endereço ou ID de outra página</label>
        <input
          id="page-link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <button
          onClick={() => {
            const id = link.match(/[0-9a-f]{8}-[0-9a-f-]{27,}/i)?.[0];
            if (id && !a.value.linked_page_ids.includes(id)) {
              set({ linked_page_ids: [...a.value.linked_page_ids, id] });
              setLink("");
            }
          }}
        >
          Vincular página
        </button>
        <ul>
          {a.value.linked_page_ids.map((id) => (
            <li key={id}>
              <LinkedPage id={id} />
              <button
                onClick={() =>
                  set({
                    linked_page_ids: a.value.linked_page_ids.filter(
                      (v) => v !== id,
                    ),
                  })
                }
              >
                Remover vínculo
              </button>
            </li>
          ))}
        </ul>
        <p>
          <a href={"#/notebooks/" + a.value.notebook_id + "/pages/" + page.id}>
            Link permanente desta página
          </a>
        </p>
      </details>
      <details>
        <summary>Origem dos recortes</summary>
        {clips.error && <p role="alert">{clips.error.message}</p>}
        {clips.data?.length === 0 && <p>Nenhum recorte nesta página.</p>}
        {clips.data?.map((c) => (
          <article key={c.id}>
            <blockquote>{c.selected_text}</blockquote>
            <p>
              Origem: {c.source.topic_title} ·{" "}
              {new Date(c.source.message_created_at).toLocaleString("pt-BR")} ·
              intervalo {c.start}–{c.end}
            </p>
            <a
              href={
                c.source.trail_id
                  ? "#/topics/" +
                    c.source.topic_id +
                    "?view=trails&trail=" +
                    c.source.trail_id +
                    "&unit=" +
                    c.source.unit_id +
                    "&version=" +
                    c.source.content_version_id
                  : "#/topics/" +
                    c.source.topic_id +
                    "/conversations/" +
                    c.source.conversation_id
              }
            >
              Abrir resposta de origem
            </a>
          </article>
        ))}
      </details>
      <details>
        <summary>Histórico de versões da página</summary>
        <button
          onClick={() => {
            void versions.refetch();
          }}
        >
          Atualizar histórico
        </button>
        {versions.data?.map((r) => (
          <div key={r.id}>
            <strong>Versão {r.snapshot.version}</strong>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Recuperar esta versão como uma nova edição? A versão atual continuará no histórico.",
                  )
                )
                  a.update(pageValue(r.snapshot));
              }}
            >
              Recuperar versão {r.snapshot.version}
            </button>
          </div>
        ))}
      </details>
      <button
        aria-expanded={showDrawing}
        onClick={() => setShowDrawing(!showDrawing)}
      >
        {showDrawing ? "Fechar quadro" : "Abrir quadro de desenho"}
      </button>
      {showDrawing && (
        <Suspense fallback={<p role="status">Carregando quadro local…</p>}>
          {drawing.isPending ? (
            <p role="status">Abrindo desenho…</p>
          ) : drawing.error ? (
            <p role="alert">{drawing.error.message}</p>
          ) : (
            drawing.data && (
              <DrawingBoard pageId={page.id} initial={drawing.data} />
            )
          )}
        </Suspense>
      )}
    </section>
  );
}
function LinkedPage({ id }: { id: string }) {
  const result = useQuery({
    queryKey: ["linked-page", id],
    queryFn: () => api("/pages/" + id, pageSchema),
  });
  return result.data ? (
    <a href={"#/notebooks/" + result.data.notebook_id + "/pages/" + id}>
      {result.data.title}
    </a>
  ) : (
    <span>{result.error ? "Página indisponível" : "Carregando vínculo…"}</span>
  );
}
