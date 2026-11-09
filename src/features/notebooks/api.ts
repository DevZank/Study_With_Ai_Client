import { z } from "zod";
export { api } from "../../lib/api";
export const documentSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();
export type RichDocument = z.infer<typeof documentSchema>;
export const notebookSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  topic_id: z.string().nullable(),
  trail_id: z.string().nullable(),
  version: z.number(),
});
export const folderSchema = z.object({
  id: z.string().uuid(),
  notebook_id: z.string(),
  parent_id: z.string().nullable(),
  title: z.string(),
  version: z.number(),
});
export const pageSchema = z.object({
  id: z.string().uuid(),
  notebook_id: z.string(),
  folder_id: z.string().nullable(),
  title: z.string(),
  document: documentSchema,
  tags: z.array(z.string()),
  topic_ids: z.array(z.string()),
  linked_page_ids: z.array(z.string()),
  version: z.number(),
  updated_at: z.string(),
});
export const sourceSchema = z.object({
  text: z.string(),
  source: z.object({
    topic_id: z.string(),
    conversation_id: z.string(),
    message_id: z.string(),
    topic_title: z.string(),
    message_created_at: z.string(),
    trail_id: z.string().nullable(),
    module_id: z.string().nullable(),
    unit_id: z.string().nullable(),
    content_version_id: z.string().nullable(),
  }),
});
export const clippingSchema = z.object({
  id: z.string(),
  selected_text: z.string(),
  start: z.number(),
  end: z.number(),
  source: sourceSchema.shape.source,
  message_id: z.string(),
});
export const sceneSchema = z.object({
  type: z.literal("excalidraw"),
  version: z.literal(2),
  source: z.literal("study-local"),
  elements: z.array(z.record(z.string(), z.unknown())),
  appState: z.record(z.string(), z.unknown()),
  files: z.record(z.string(), z.unknown()),
});
export const drawingSchema = z.object({
  id: z.string(),
  page_id: z.string(),
  version: z.number(),
  scene: sceneSchema,
});
export type NotePage = z.infer<typeof pageSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Notebook = z.infer<typeof notebookSchema>;
export type Folder = z.infer<typeof folderSchema>;
export type PageValue = Omit<NotePage, "id" | "version" | "updated_at">;
export function pageValue(p: NotePage): PageValue {
  return {
    notebook_id: p.notebook_id,
    folder_id: p.folder_id,
    title: p.title,
    document: p.document,
    tags: p.tags,
    topic_ids: p.topic_ids,
    linked_page_ids: p.linked_page_ids,
  };
}
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
