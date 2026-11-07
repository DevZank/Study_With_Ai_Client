import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Topics } from "../features/themes/Topics";
import "../styles/app.css";

const client = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 1000 } },
});
const root = document.getElementById("root");
if (!root) throw new Error("Elemento raiz não encontrado.");
createRoot(root).render(
  <QueryClientProvider client={client}>
    <Topics />
  </QueryClientProvider>,
);
