import { z } from "zod";
import { api, all, messageSchema } from "../../lib/api";

export const planSchema = z.object({
  title: z.string(),
  objectives: z.array(z.string()),
  criteria: z.array(z.string()),
  estimated_minutes: z.number(),
  lesson_titles: z.array(z.string()),
});
export const trailSchema = z.object({
  id: z.string(),
  topic_id: z.string(),
  title: z.string(),
  objective: z.string(),
  prior_knowledge: z.string(),
  preferences: z.string(),
  prerequisites: z.array(z.string()),
  version: z.number(),
});
export const moduleSchema = z.object({
  id: z.string(),
  trail_id: z.string(),
  position: z.number(),
  plan: planSchema,
  archived: z.boolean(),
  granularity: z.enum(["module", "lesson"]),
});
export const unitSchema = z.object({
  id: z.string(),
  module_id: z.string(),
  position: z.number(),
  title: z.string(),
});
export const versionSchema = z.object({
  id: z.string(),
  unit_id: z.string(),
  number: z.number(),
  message_id: z.string(),
  model_id: z.string(),
  plan_version: z.number(),
  context: z.string(),
});
export const summarySchema = z.object({
  id: z.string(),
  version_id: z.string(),
  content: z.object({
    concepts: z.array(z.string()),
    conclusions: z.array(z.string()),
    next_steps: z.array(z.string()),
  }),
  difficulties: z.string(),
  objective_attempts: z.number(),
  matching_answers: z.number(),
  mastery_estimate: z.null(),
});
export const unitViewSchema = z.object({
  unit: unitSchema,
  versions: z.array(versionSchema),
  summaries: z.array(summarySchema),
});
export const moduleViewSchema = z.object({
  module: moduleSchema,
  units: z.array(unitViewSchema),
});
export const trailViewSchema = z.object({
  trail: trailSchema,
  modules: z.array(moduleViewSchema),
  completed_units: z.number(),
  total_units: z.number(),
});
export const versionViewSchema = z.object({
  version: versionSchema,
  message: messageSchema,
  summaries: z.array(summarySchema),
  stale: z.boolean(),
});
export const trailJobSchema = z.object({
  id: z.string(),
  kind: z.enum(["plan", "unit", "summary"]),
  target_id: z.string(),
  trail_id: z.string(),
  status: z.enum([
    "running",
    "completed",
    "failed",
    "cancelled",
    "interrupted",
  ]),
  result_id: z.string(),
  error_message: z.string(),
  cached: z.boolean(),
});
export type ModuleView = z.infer<typeof moduleViewSchema>;
export type TrailView = z.infer<typeof trailViewSchema>;
export type UnitView = z.infer<typeof unitViewSchema>;
export type TrailJob = z.infer<typeof trailJobSchema>;
export const contextSchema = z.object({
  previous_summaries: z.array(
    z.object({
      summary_id: z.string(),
      concepts: z.array(z.string()),
      conclusions: z.array(z.string()),
      difficulties: z.string(),
      next_steps: z.array(z.string()),
    }),
  ),
  omitted_summaries: z.number(),
});
export { api, all };
