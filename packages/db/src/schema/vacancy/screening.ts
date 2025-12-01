import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { vacancyResponse } from "./response";

/**
 * Таблица для результатов скрининга откликов
 */
export const responseScreening = pgTable("response_screenings", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v7()`),
  responseId: uuid("response_id")
    .notNull()
    .references(() => vacancyResponse.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // Оценка от 1 до 5
  detailedScore: integer("detailed_score").notNull(), // Детальная оценка от 0 до 100
  questions: jsonb("questions"), // Массив вопросов для кандидата
  analysis: text("analysis"), // Анализ соответствия резюме вакансии
  greeting: text("greeting"), // Приветственное предложение для начала диалога
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const CreateResponseScreeningSchema = createInsertSchema(
  responseScreening,
  {
    responseId: z.string().uuid(),
    score: z.number().int().min(1).max(5),
    detailedScore: z.number().int().min(0).max(100),
    questions: z.array(z.string()).optional(),
    analysis: z.string().optional(),
    greeting: z.string().optional(),
  },
).omit({
  id: true,
  createdAt: true,
});
