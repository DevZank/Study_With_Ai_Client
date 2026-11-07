import { z } from "zod";

export const topicSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(["active", "archived", "deleted"]),
  created_at: z.string(),
  updated_at: z.string(),
});
export const conversationSchema = z.object({
  id: z.string().uuid(),
  topic_id: z.string().uuid(),
  title: z.string(),
  created_at: z.string(),
});
export const messageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  status: z.enum([
    "running",
    "completed",
    "failed",
    "cancelled",
    "interrupted",
  ]),
  model_id: z.string(),
  created_at: z.string(),
});
export const jobSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  message_id: z.string().uuid(),
  model_id: z.string(),
  status: z.enum([
    "running",
    "completed",
    "failed",
    "cancelled",
    "interrupted",
  ]),
  error_code: z.string(),
  error_message: z.string(),
});
export const streamSchema = z.object({
  event_id: z.string(),
  job_id: z.string().uuid(),
  job: jobSchema,
  message: messageSchema,
});
export type Topic = z.infer<typeof topicSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Job = z.infer<typeof jobSchema>;

export function parseStream(data: string) {
  try {
    return streamSchema.safeParse(JSON.parse(data) as unknown);
  } catch {
    return streamSchema.safeParse(null);
  }
}

export async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  method = "POST",
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/v1" + path, {
      method: body === undefined ? "GET" : method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "Não foi possível acessar a API local. Verifique a conexão e tente novamente.",
    );
  }
  const value: unknown = await response.json();
  if (!response.ok) {
    const parsed = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(value);
    throw new Error(
      parsed.success ? parsed.data.error.message : "A API retornou um erro.",
    );
  }
  const result = schema.safeParse(value);
  if (!result.success) throw new Error("A API retornou dados inesperados.");
  return result.data;
}

export async function all<T>(path: string, schema: z.ZodType<T>): Promise<T[]> {
  const output: T[] = [];
  let cursor: string | null = null;
  do {
    const suffix: string = cursor
      ? "&cursor=" + encodeURIComponent(cursor)
      : "";
    const page: { items: T[]; next_cursor: string | null } = await api(
      path + (path.includes("?") ? "&" : "?") + "limit=100" + suffix,
      z.object({ items: z.array(schema), next_cursor: z.string().nullable() }),
    );
    output.push(...page.items);
    cursor = page.next_cursor;
    if (output.length > 10000)
      throw new Error("Lista extensa demais. Refine a consulta.");
  } while (cursor);
  return output;
}

export const modelsSchema = z.object({
  models: z.array(z.string()),
  local_only: z.literal(true),
  provider: z.literal("ollama"),
});
