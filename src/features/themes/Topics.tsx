import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  all,
  api,
  conversationSchema,
  topicSchema,
  type Topic,
} from "../../lib/api";
import { Chat } from "../chat/Chat";
import { Trails } from "../trails/Trails";

function navigate(topicId = "", conversationId = "") {
  location.hash = topicId
    ? "/topics/" +
      topicId +
      (conversationId ? "/conversations/" + conversationId : "")
    : "/";
}

function useRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const update = () => {
      setHash(location.hash);
      document.getElementById("content")?.focus();
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const match =
    /^#\/topics\/([a-f0-9-]+)(?:\/conversations\/([a-f0-9-]+))?$/.exec(
      hash.split("?")[0],
    );
  return { topicId: match?.[1] ?? "", conversationId: match?.[2] ?? "" };
}

function TopicPanel({
  topic,
  conversationId,
}: {
  topic: Topic;
  conversationId: string;
}) {
  const client = useQueryClient();
  const [title, setTitle] = useState(topic.title);
  const [experience, setExperience] = useState(
    location.hash.includes("view=trails") ? "trails" : "free",
  );
  const list = useQuery({
    queryKey: ["conversations", topic.id],
    queryFn: () =>
      all("/topics/" + topic.id + "/conversations", conversationSchema),
    enabled: topic.status !== "deleted",
  });
  const edit = useMutation({
    mutationFn: (body: { title?: string; status?: string }) =>
      api("/topics/" + topic.id, topicSchema, body, "PATCH"),
    onSuccess: () => client.invalidateQueries({ queryKey: ["topics"] }),
  });
  const create = useMutation({
    mutationFn: () =>
      api("/topics/" + topic.id + "/conversations", conversationSchema, {
        title: "Conversa " + ((list.data?.length ?? 0) + 1),
      }),
    onSuccess: (conversation) => {
      void client.invalidateQueries({ queryKey: ["conversations", topic.id] });
      navigate(topic.id, conversation.id);
    },
  });
  const selected = list.data?.find((c) => c.id === conversationId);
  return (
    <>
      <div className="topic-head">
        <div>
          <p className="eyebrow">TEMA DE ESTUDO</p>
          <h1>{topic.title}</h1>
        </div>
        <a href="#/">Visão geral</a>
      </div>
      {(edit.error || create.error) && (
        <p role="alert">{edit.error?.message || create.error?.message}</p>
      )}
      <details>
        <summary>Gerenciar tema</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            edit.mutate({ title });
          }}
        >
          <label htmlFor="rename">Nome do tema</label>
          <input
            id="rename"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
          <button disabled={edit.isPending || !title.trim()}>
            Salvar nome
          </button>
        </form>
        <div className="actions">
          <button
            disabled={edit.isPending}
            onClick={() =>
              edit.mutate({
                status: topic.status === "active" ? "archived" : "active",
              })
            }
          >
            {topic.status === "active" ? "Arquivar tema" : "Restaurar tema"}
          </button>
          {topic.status !== "deleted" && (
            <button
              disabled={edit.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Mover este tema para a lixeira? Suas conversas serão preservadas e o tema poderá ser restaurado.",
                  )
                )
                  edit.mutate({ status: "deleted" });
              }}
            >
              Mover para lixeira
            </button>
          )}
        </div>
      </details>
      {topic.status === "deleted" ? (
        <p role="status">
          Este tema está na lixeira. Restaure para consultar suas conversas.
        </p>
      ) : (
        <>
          <nav className="tabs" aria-label="Experiência de estudo">
            <button
              aria-pressed={experience === "free"}
              onClick={() => {
                setExperience("free");
                history.replaceState(
                  null,
                  "",
                  location.pathname +
                    location.search +
                    location.hash.split("?")[0],
                );
              }}
            >
              Estudo livre
            </button>
            <button
              aria-pressed={experience === "trails"}
              onClick={() => {
                setExperience("trails");
                history.replaceState(
                  null,
                  "",
                  location.pathname +
                    location.search +
                    location.hash.split("?")[0] +
                    "?view=trails",
                );
              }}
            >
              Trilhas guiadas
            </button>
          </nav>
          {experience === "trails" ? (
            <Trails topicId={topic.id} editable={topic.status === "active"} />
          ) : (
            <>
              <nav className="tabs" aria-label="Conversas do tema">
                {list.data?.map((c) => (
                  <a
                    key={c.id}
                    href={"#/topics/" + topic.id + "/conversations/" + c.id}
                    aria-current={selected?.id === c.id ? "page" : undefined}
                  >
                    {c.title}
                  </a>
                ))}
                <button
                  onClick={() => create.mutate()}
                  disabled={topic.status !== "active" || create.isPending}
                >
                  {create.isPending ? "Criando…" : "Nova conversa"}
                </button>
              </nav>
              {list.isPending && <p role="status">Carregando conversas…</p>}
              {list.error && <p role="alert">{list.error.message}</p>}
              {selected ? (
                <Chat
                  key={selected.id}
                  conversationId={selected.id}
                  editable={topic.status === "active"}
                />
              ) : (
                <div className="empty">
                  <h2>Conversas deste tema</h2>
                  <p>Abra uma conversa ou crie uma para começar.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

export function Topics() {
  const { topicId, conversationId } = useRoute();
  const client = useQueryClient();
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const list = useQuery({
    queryKey: ["topics", filter, search],
    queryFn: () =>
      all(
        "/topics?status=" + filter + "&q=" + encodeURIComponent(search),
        topicSchema,
      ),
  });
  const detail = useQuery({
    queryKey: ["topics", "detail", topicId],
    queryFn: () => api("/topics/" + topicId, topicSchema),
    enabled: !!topicId,
  });
  const create = useMutation({
    mutationFn: () => api("/topics", topicSchema, { title }),
    onSuccess: (topic) => {
      setTitle("");
      setFilter("active");
      setSearch("");
      void client.invalidateQueries({ queryKey: ["topics"] });
      navigate(topic.id);
    },
  });
  return (
    <div className="layout">
      <a
        className="skip-link"
        href="#content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("content")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <aside>
        <a className="brand" href="#/">
          Estudos com IA <span>ESPAÇO LOCAL</span>
        </a>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <label htmlFor="topic-title">Novo tema</label>
          <input
            id="topic-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="O que você quer estudar?"
            required
          />
          <button
            className="primary"
            disabled={!title.trim() || create.isPending}
          >
            {create.isPending ? "Criando…" : "Criar tema"}
          </button>
        </form>
        {create.error && <p role="alert">{create.error.message}</p>}
        <label htmlFor="search">Pesquisar temas</label>
        <input
          id="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label htmlFor="filter">Exibir</label>
        <select
          id="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="active">Ativos</option>
          <option value="archived">Arquivados</option>
          <option value="deleted">Lixeira</option>
        </select>
        <nav aria-label="Temas">
          {list.isPending && <p role="status">Carregando temas…</p>}
          {list.error && (
            <p role="alert">
              {list.error.message}{" "}
              <button
                onClick={() => {
                  void list.refetch();
                }}
              >
                Tentar novamente
              </button>
            </p>
          )}
          {list.data?.length === 0 && <p>Nenhum tema encontrado.</p>}
          {list.data?.map((topic) => (
            <a
              key={topic.id}
              href={"#/topics/" + topic.id}
              aria-current={topic.id === topicId ? "page" : undefined}
            >
              {topic.title}
            </a>
          ))}
        </nav>
        <p className="hint">
          Seus dados ficam neste computador. As respostas da IA podem conter
          erros.
        </p>
      </aside>
      <main id="content" tabIndex={-1}>
        {topicId ? (
          detail.isPending ? (
            <p role="status">Abrindo tema…</p>
          ) : detail.error ? (
            <p role="alert">{detail.error.message}</p>
          ) : (
            detail.data && (
              <TopicPanel
                key={detail.data.id}
                topic={detail.data}
                conversationId={conversationId}
              />
            )
          )
        ) : (
          <div className="welcome">
            <p className="eyebrow">SEU ESPAÇO DE APRENDIZAGEM</p>
            <h1>
              Um tema.
              <br />
              Uma boa pergunta.
              <br />
              Um novo começo.
            </h1>
            <p>
              Organize seus assuntos e converse com uma IA executada no seu
              computador.
            </p>
            <h2>Comece pelo que desperta sua curiosidade</h2>
            <p>
              Crie um tema no menu ou retome uma conversa existente. Seu
              histórico será salvo automaticamente.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
