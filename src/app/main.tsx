import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { checkHealth } from "../lib/health";

function App() {
  const [status, setStatus] = useState("Verificando a conexão com a API…");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    let active = true;

    void checkHealth(controller.signal)
      .then(() => {
        if (active) setStatus("API local disponível.");
      })
      .catch(() => {
        if (active)
          setStatus(
            "API local indisponível. Inicie o servidor e recarregue a página.",
          );
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <main>
      <h1>Plataforma de Estudos com IA</h1>
      <p role="status">{status}</p>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Elemento raiz não encontrado.");
createRoot(root).render(<App />);
