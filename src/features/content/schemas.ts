import { z } from "zod";

export const modeSchema = z.enum(["study", "memorize", "learn", "practice"]);
export type Mode = z.infer<typeof modeSchema>;
export const modes: Record<Mode, { label: string; description: string }> = {
  study: {
    label: "Estudar",
    description: "Fundamentos, relações, exemplos e reflexão.",
  },
  memorize: {
    label: "Memorizar",
    description: "Recuperação ativa com cartões de pergunta e resposta.",
  },
  learn: {
    label: "Aprender",
    description: "Explicação breve, analogia e exemplo.",
  },
  practice: {
    label: "Praticar",
    description: "Exercícios, dicas e feedback após a tentativa.",
  },
};
const text = z.string().min(1).max(4000);
const short = z.string().min(1).max(160);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/);
const base = { id };
export const blockSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...base,
      type: z.enum([
        "text",
        "explanation",
        "example",
        "hint",
        "summary",
        "curiosity",
        "check_question",
      ]),
      text,
    })
    .strict(),
  z
    .object({ ...base, type: z.literal("code"), language: short, code: text })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("formula"),
      latex: z.string().min(1).max(1000),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.enum(["table", "comparison"]),
      columns: z.array(short).min(1).max(8),
      rows: z.array(z.array(short).max(8)).min(1).max(20),
    })
    .strict()
    .refine((b) => b.rows.every((r) => r.length === b.columns.length)),
  z
    .object({ ...base, type: z.literal("flashcard"), front: text, back: text })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("timeline"),
      items: z
        .array(z.object({ label: short, text }).strict())
        .min(1)
        .max(12),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("diagram"),
      nodes: z.array(short).min(1).max(8),
      edges: z
        .array(
          z
            .object({
              source: z.number().int().min(0).max(7),
              target: z.number().int().min(0).max(7),
              label: short,
            })
            .strict(),
        )
        .max(12),
    })
    .strict()
    .refine((b) =>
      b.edges.every(
        (e) => e.source < b.nodes.length && e.target < b.nodes.length,
      ),
    ),
  z
    .object({
      ...base,
      type: z.literal("source"),
      text: z.literal(
        "Conhecimento do modelo; nenhuma fonte externa foi consultada.",
      ),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.enum(["quiz", "exercise"]),
      exercise_id: z.string().uuid(),
    })
    .strict(),
]);
export const documentSchema = z
  .object({
    schema_version: z.literal("1.0"),
    mode: modeSchema,
    title: short,
    blocks: z.array(z.unknown()).min(1).max(12),
  })
  .strict();
export type ContentBlock = z.infer<typeof blockSchema>;
