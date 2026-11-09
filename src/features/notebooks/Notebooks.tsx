import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useQueries,
} from "@tanstack/react-query";
import { z } from "zod";
import {
  api,
  notebookSchema,
  pageSchema,
  folderSchema,
  type Notebook,
  type Folder,
} from "./api";
import { all, topicSchema } from "../../lib/api";
import { PageEditor } from "./PageEditor";

export function Notebooks({
  notebookId,
  pageId,
}: {
  notebookId: string;
  pageId: string;
}) {
  const client = useQueryClient(),
    [title, setTitle] = useState(""),
    [scope, setScope] = useState(
      new URLSearchParams(location.hash.split("?")[1]).get("topic") || "",
    ),
    [trail, setTrail] = useState(""),
    [search, setSearch] = useState(""),
    [folder, setFolder] = useState("");
  const books = useQuery({
    queryKey: ["notebooks"],
    queryFn: () => api("/notebooks", z.array(notebookSchema)),
  });
  const topics = useQuery({
    queryKey: ["notebook-topics"],
    queryFn: () => all("/topics", topicSchema),
  });
  const trails = useQuery({
    queryKey: ["notebook-trails", scope],
    queryFn: () =>
      all(
        "/topics/" + scope + "/trails",
        z.object({ id: z.string(), title: z.string() }),
      ),
    enabled: !!scope,
  });
  const pages = useQuery({
    queryKey: ["note-pages", notebookId, search],
    queryFn: () =>
      api(
        "/notebooks/" + notebookId + "/pages?q=" + encodeURIComponent(search),
        z.array(pageSchema),
      ),
    enabled: !!notebookId,
  });
  const detail = useQuery({
    queryKey: ["note-page", pageId],
    queryFn: () => api("/pages/" + pageId, pageSchema),
    enabled: !!pageId,
  });
  const folderQueries = useQueries({
    queries: (books.data || []).map((n) => ({
      queryKey: ["note-folders", n.id],
      queryFn: () =>
        api("/notebooks/" + n.id + "/folders", z.array(folderSchema)),
    })),
  });
  const folders = folderQueries.flatMap((q) => q.data || []);
  const create = useMutation({
    mutationFn: () =>
      api("/notebooks", notebookSchema, {
        title,
        topic_id: scope || null,
        trail_id: trail || null,
      }),
    onSuccess: (n) => {
      setTitle("");
      void client.invalidateQueries({ queryKey: ["notebooks"] });
      location.hash = "/notebooks/" + n.id;
    },
  });
  const error =
    books.error ||
    topics.error ||
    trails.error ||
    pages.error ||
    detail.error ||
    create.error ||
    folderQueries.find((q) => q.error)?.error;
  const book = books.data?.find((n) => n.id === notebookId);
  return (
    <section aria-label="Cadernos">
      <h1>Cadernos</h1>
      <p>
        Escreva livremente. Texto e desenho ficam neste computador e não são
        enviados à IA.
      </p>
      {error && (
        <p role="alert">
          {error.message}
          <button
            onClick={() => {
              void client.invalidateQueries({ queryKey: ["notebooks"] });
              void pages.refetch();
              void detail.refetch();
            }}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {books.isPending && <p role="status">Carregando cadernos…</p>}
      <nav className="tabs" aria-label="Cadernos disponíveis">
        {books.data?.map((n) => (
          <a
            key={n.id}
            href={"#/notebooks/" + n.id}
            aria-current={n.id === notebookId ? "page" : undefined}
          >
            {n.title} · {n.topic_id ? "tema" : "global"}
          </a>
        ))}
      </nav>
      {books.data?.length === 0 && (
        <p>Crie seu primeiro caderno global ou por tema.</p>
      )}
      <details>
        <summary>Criar caderno</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <label htmlFor="book-title">Nome do caderno</label>
          <input
            id="book-title"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="book-scope">Escopo do caderno</label>
          <select
            id="book-scope"
            value={scope}
            onChange={(e) => {
              setScope(e.target.value);
              setTrail("");
            }}
          >
            <option value="">Global</option>
            {topics.data?.map((t) => (
              <option value={t.id} key={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          {scope && (
            <>
              <label htmlFor="book-trail">Trilha vinculada (opcional)</label>
              <select
                id="book-trail"
                value={trail}
                onChange={(e) => setTrail(e.target.value)}
              >
                <option value="">Sem trilha</option>
                {trails.data?.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </>
          )}
          <button disabled={!title.trim() || create.isPending}>
            Criar caderno
          </button>
        </form>
      </details>
      {book && (
        <>
          <h2>{book.title}</h2>
          <label htmlFor="note-search">Pesquisar páginas, texto e tags</label>
          <input
            id="note-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={120}
          />
          <label htmlFor="folder-filter">Exibir pasta</label>
          <select
            id="folder-filter"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="none">Sem pasta</option>
            {folders
              .filter((f) => f.notebook_id === book.id)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
          </select>
          <nav className="tabs" aria-label="Páginas do caderno">
            {pages.data
              ?.filter(
                (p) =>
                  !folder ||
                  (folder === "none" ? !p.folder_id : p.folder_id === folder),
              )
              .map((p) => (
                <a
                  href={"#/notebooks/" + p.notebook_id + "/pages/" + p.id}
                  key={p.id}
                  aria-current={p.id === pageId ? "page" : undefined}
                >
                  {p.title}
                </a>
              ))}
          </nav>
          {pages.data?.length === 0 && <p>Nenhuma página encontrada.</p>}
          <CreatePage book={book} folders={folders} />
          <FolderManager book={book} folders={folders} />
        </>
      )}
      {detail.isPending && pageId && <p role="status">Carregando página…</p>}
      {detail.data && books.data && (
        <PageEditor
          key={detail.data.id}
          page={detail.data}
          notebooks={books.data}
          folders={folders}
        />
      )}
    </section>
  );
}

function CreatePage({ book, folders }: { book: Notebook; folders: Folder[] }) {
  const client = useQueryClient(),
    [title, setTitle] = useState(""),
    [folder, setFolder] = useState("");
  const create = useMutation({
    mutationFn: () =>
      api("/notebooks/" + book.id + "/pages", pageSchema, {
        title,
        folder_id: folder || null,
      }),
    onSuccess: (p) => {
      setTitle("");
      void client.invalidateQueries({ queryKey: ["note-pages"] });
      location.hash = "/notebooks/" + book.id + "/pages/" + p.id;
    },
  });
  return (
    <details>
      <summary>Nova página</summary>
      {create.error && <p role="alert">{create.error.message}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <label htmlFor="new-page">Nome da nova página</label>
        <input
          id="new-page"
          maxLength={120}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="new-page-folder">Pasta da nova página</label>
        <select
          id="new-page-folder"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        >
          <option value="">Sem pasta</option>
          {folders
            .filter((f) => f.notebook_id === book.id)
            .map((f) => (
              <option value={f.id} key={f.id}>
                {f.title}
              </option>
            ))}
        </select>
        <button disabled={!title.trim() || create.isPending}>
          Criar página
        </button>
      </form>
    </details>
  );
}
function FolderManager({
  book,
  folders,
}: {
  book: Notebook;
  folders: Folder[];
}) {
  const client = useQueryClient(),
    [title, setTitle] = useState(""),
    [parent, setParent] = useState(""),
    [selected, setSelected] = useState("");
  const local = folders.filter((f) => f.notebook_id === book.id);
  const edit = useMutation({
    mutationFn: () =>
      selected
        ? api(
            "/folders/" + selected,
            folderSchema,
            {
              title,
              parent_id: parent || null,
              expected_version: local.find((f) => f.id === selected)?.version,
            },
            "PATCH",
          )
        : api("/notebooks/" + book.id + "/folders", folderSchema, {
            title,
            parent_id: parent || null,
          }),
    onSuccess: () => {
      setTitle("");
      setParent("");
      setSelected("");
      void client.invalidateQueries({ queryKey: ["note-folders"] });
    },
  });
  return (
    <details>
      <summary>Gerenciar pastas</summary>
      {edit.error && <p role="alert">{edit.error.message}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          edit.mutate();
        }}
      >
        <label htmlFor="edit-folder">Pasta para editar</label>
        <select
          id="edit-folder"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            const f = local.find((f) => f.id === e.target.value);
            setTitle(f?.title || "");
            setParent(f?.parent_id || "");
          }}
        >
          <option value="">Criar pasta</option>
          {local.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
        <label htmlFor="folder-name">Nome da pasta</label>
        <input
          id="folder-name"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="folder-parent">Pasta superior</label>
        <select
          id="folder-parent"
          value={parent}
          onChange={(e) => setParent(e.target.value)}
        >
          <option value="">Raiz do caderno</option>
          {local
            .filter((f) => f.id !== selected)
            .map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
        </select>
        <button disabled={!title.trim() || edit.isPending}>Salvar pasta</button>
      </form>
    </details>
  );
}
