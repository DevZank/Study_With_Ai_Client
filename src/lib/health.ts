export async function checkHealth(signal: AbortSignal): Promise<void> {
  const response = await fetch("/api/v1/health", { signal, cache: "no-store" });
  if (!response.ok) throw new Error("API indisponível.");
  const body: unknown = await response.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("status" in body) ||
    body.status !== "ok"
  ) {
    throw new Error("Resposta inesperada da API.");
  }
}
