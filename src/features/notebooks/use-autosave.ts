import { useEffect, useRef, useState } from "react";
import { z } from "zod";

export function useAutosave<T>(
  key: string,
  initial: T,
  version: number,
  schema: z.ZodType<T>,
  save: (value: T, version: number, id: string) => Promise<{ version: number }>,
) {
  const [value, setValue] = useState(initial),
    [status, setStatus] = useState("Salvo no computador."),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const state = useRef({
    value: initial,
    version,
    id: "",
    dirty: false,
    saving: false,
    stopped: false,
    draftSaved: true,
  });
  const mounted = useRef(true),
    saveRef = useRef(save);
  saveRef.current = save;
  const persist = () => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          value: state.current.value,
          version: state.current.version,
          id: state.current.id,
        }),
      );
      state.current.draftSaved = true;
    } catch {
      state.current.draftSaved = false;
      setError(
        "Não foi possível guardar o rascunho no navegador. Mantenha esta página aberta e exporte seu rascunho.",
      );
    }
  };
  useEffect(() => {
    mounted.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const draft = z
          .object({ value: schema, version: z.number(), id: z.string() })
          .parse(JSON.parse(raw) as unknown);
        if (JSON.stringify(draft.value) === JSON.stringify(initial))
          localStorage.removeItem(key);
        else {
          state.current = {
            ...state.current,
            ...draft,
            dirty: true,
            stopped: draft.version !== version,
          };
          setValue(draft.value);
          setStatus("Rascunho recuperado neste navegador.");
          if (draft.version !== version)
            setError(
              "Existe outra versão no banco. Exporte seu rascunho para conciliar antes de recarregar.",
            );
        }
      }
    } catch {
      setError(
        "Rascunho local não pôde ser recuperado. Nenhum conteúdo do banco foi sobrescrito.",
      );
      state.current.stopped = true;
    }
    setReady(true);
    const warn = (e: BeforeUnloadEvent) => {
      if (state.current.dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    const protect = (event: MouseEvent) => {
      if (
        state.current.dirty &&
        !state.current.draftSaved &&
        event.target instanceof Element &&
        event.target.closest('a[href^="#"]')
      ) {
        if (
          !window.confirm(
            "O rascunho não pôde ser guardado. Sair pode perder estas alterações. Deseja sair mesmo assim?",
          )
        )
          event.preventDefault();
      }
    };
    document.addEventListener("click", protect, true);
    return () => {
      mounted.current = false;
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", protect, true);
    };
  }, [key]);
  const update = (v: T) => {
    if (JSON.stringify(v) === JSON.stringify(state.current.value)) return;
    state.current.value = v;
    state.current.dirty = true;
    // O identificador do envio em curso fica estável; a próxima edição ganha outro UUID.
    if (!state.current.saving) state.current.id = crypto.randomUUID();
    setValue(v);
    setStatus("Alterações pendentes; salvamento automático…");
    persist();
  };
  const flush = async () => {
    const s = state.current;
    if (!s.dirty || s.saving || s.stopped) return;
    const sent = s.value,
      id = s.id || crypto.randomUUID();
    s.id = id;
    s.saving = true;
    if (mounted.current) setStatus("Salvando…");
    try {
      const result = await saveRef.current(sent, s.version, id);
      s.version = result.version;
      if (JSON.stringify(s.value) === JSON.stringify(sent)) {
        s.dirty = false;
        localStorage.removeItem(key);
        if (mounted.current) {
          setStatus("Salvo no computador.");
          setError("");
        }
      } else {
        s.id = crypto.randomUUID();
        persist();
      }
    } catch (e) {
      s.stopped = true;
      persist();
      if (mounted.current) {
        setError(e instanceof Error ? e.message : "Falha ao salvar.");
        setStatus("Alterações ainda não salvas no banco.");
      }
    } finally {
      s.saving = false;
    }
  };
  useEffect(() => {
    const timer = setInterval(() => {
      void flush();
    }, 1000);
    return () => clearInterval(timer);
  }, [key]);
  return {
    value,
    update,
    status,
    error,
    ready,
    version: state.current.version,
    dirty: state.current.dirty,
    retry: () => {
      state.current.stopped = false;
      setError("");
      void flush();
    },
    exportDraft: () => {
      const blob = new Blob([JSON.stringify(state.current.value, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "rascunho-caderno.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    reload: () => {
      if (
        window.confirm(
          "Recarregar a versão do banco e descartar apenas o rascunho deste navegador? Exporte o rascunho primeiro se desejar preservá-lo.",
        )
      ) {
        localStorage.removeItem(key);
        location.reload();
      }
    },
  };
}
