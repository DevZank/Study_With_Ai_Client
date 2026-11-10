import { z } from "zod";
export { api } from "../../lib/api";

export const flashcardSchema = z.object({
  id: z.string().uuid(),
  topic_id: z.string().uuid(),
  concept_id: z.string().nullable(),
  concept_name: z.string(),
  front: z.string(),
  back: z.string(),
  source_type: z.enum(["manual", "message_block", "notebook_page"]),
  source_ref: z.record(z.string(), z.unknown()),
  archived: z.boolean(),
  version: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const reviewStateSchema = z.object({
  id: z.string().uuid(),
  flashcard_id: z.string().uuid(),
  topic_id: z.string().uuid(),
  due_at: z.string(),
  stability: z.number(),
  difficulty: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.enum(["new", "learning", "review", "relearning"]),
  last_reviewed_at: z.string().nullable(),
  version: z.number(),
});

export const flashcardViewSchema = z.object({
  card: flashcardSchema,
  review_state: reviewStateSchema,
  estimated_retention: z.number().nullable(),
  due: z.boolean(),
});

export const reviewEventSchema = z.object({
  id: z.string().uuid(),
  review_state_id: z.string().uuid(),
  flashcard_id: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  reviewed_at: z.string(),
  elapsed_days: z.number(),
  scheduled_days: z.number(),
  stability_before: z.number(),
  stability_after: z.number(),
  difficulty_before: z.number(),
  difficulty_after: z.number(),
  was_due: z.boolean(),
  xp_awarded: z.number(),
});

export const reviewGradeViewSchema = z.object({
  card: flashcardSchema,
  review_state: reviewStateSchema,
  event: reviewEventSchema,
});

export const conceptMasterySchema = z.object({
  id: z.string().uuid(),
  concept_id: z.string().uuid(),
  topic_id: z.string().uuid(),
  concept_name: z.string(),
  score: z.number().nullable(),
  evidence_count: z.number(),
  objective_attempts: z.number(),
  correct_attempts: z.number(),
  review_count: z.number(),
  uncertainty: z.enum(["unestimated", "high", "moderate", "low"]),
  last_assessed_at: z.string().nullable(),
});

export const xpEventSchema = z.object({
  id: z.string().uuid(),
  topic_id: z.string().nullable(),
  source_type: z.enum([
    "exercise_first_try",
    "exercise_correct",
    "flashcard_review",
    "unit_completion",
  ]),
  source_id: z.string(),
  source_key: z.string(),
  points: z.number(),
  reason: z.string(),
  created_at: z.string(),
});

export const achievementViewSchema = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string(),
  earned: z.boolean(),
  earned_at: z.string().nullable(),
});

export const gamificationSchema = z.object({
  total_xp: z.number(),
  level: z.number(),
  current_level_xp: z.number(),
  next_level_xp: z.number(),
  hide_gamification: z.boolean(),
  anti_farming_policy: z.string(),
  recent_xp_events: z.array(xpEventSchema),
  achievements: z.array(achievementViewSchema),
});

export const topicProgressSchema = z.object({
  topic_id: z.string().uuid(),
  calculated_at: z.string(),
  completion: z.object({
    trails: z.array(
      z.object({
        trail_id: z.string(),
        title: z.string(),
        completed_units: z.number(),
        generated_units: z.number(),
        total_units: z.number(),
        completion_ratio: z.number().nullable(),
      }),
    ),
    completed_units: z.number(),
    generated_units: z.number(),
    total_units: z.number(),
    completion_ratio: z.number().nullable(),
  }),
  mastery: z.object({
    estimated_score: z.number().nullable(),
    evaluated_concepts: z.number(),
    total_concepts: z.number(),
    concepts: z.array(conceptMasterySchema),
  }),
  retention: z.object({
    estimated_retention: z.number().nullable(),
    active_cards: z.number(),
    reviewed_cards: z.number(),
    due_cards: z.number(),
  }),
  explanations: z.object({
    completion: z.string(),
    mastery: z.string(),
    retention: z.string(),
  }),
  recommendations: z.array(
    z.object({
      kind: z.string(),
      title: z.string(),
      description: z.string(),
    }),
  ),
  gamification: gamificationSchema,
});

export const overviewSchema = z.object({
  calculated_at: z.string(),
  due_count: z.number(),
  active_topics_count: z.number(),
  gamification: gamificationSchema,
});

export const preferenceSchema = z.object({
  id: z.string(),
  hide_gamification: z.boolean(),
  version: z.number(),
});

export type FlashcardView = z.infer<typeof flashcardViewSchema>;
export type ReviewEvent = z.infer<typeof reviewEventSchema>;
export type TopicProgress = z.infer<typeof topicProgressSchema>;
export type Gamification = z.infer<typeof gamificationSchema>;
export type Rating = 1 | 2 | 3 | 4;

export function formatPct(value: number | null): string {
  if (value === null) return "Não estimado";
  return Math.round(value * 100) + "%";
}
