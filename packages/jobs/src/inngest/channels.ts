import { channel, topic } from "@inngest/realtime";
import { z } from "zod";

/**
 * Канал для отслеживания прогресса скрининга новых откликов
 */
export const screenNewResponsesChannel = channel(
  (vacancyId: string) => `screen-new-responses:${vacancyId}`,
)
  .addTopic(
    topic("progress").schema(
      z.object({
        vacancyId: z.string(),
        status: z.enum(["started", "processing", "completed", "error"]),
        message: z.string(),
        total: z.number().optional(),
        processed: z.number().optional(),
        failed: z.number().optional(),
      }),
    ),
  )
  .addTopic(
    topic("result").schema(
      z.object({
        vacancyId: z.string(),
        success: z.boolean(),
        total: z.number(),
        processed: z.number(),
        failed: z.number(),
      }),
    ),
  );
