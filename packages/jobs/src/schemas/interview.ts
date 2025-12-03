import { z } from "zod";

/**
 * Схема для анализа ответа кандидата и генерации следующего вопроса
 */
export const interviewAnalysisSchema = z.object({
  analysis: z
    .string()
    .describe("Краткая оценка ответа кандидата в 1-2 предложения"),
  shouldContinue: z.boolean().describe("Стоит ли задавать следующий вопрос"),
  reason: z
    .string()
    .nullish()
    .describe("Причина завершения интервью, если shouldContinue=false"),
  nextQuestion: z
    .string()
    .optional()
    .describe("Следующий вопрос кандидату, если shouldContinue=true"),
});

/**
 * Схема для финального скоринга интервью
 */
export const interviewScoringSchema = z.object({
  score: z
    .number()
    .min(1)
    .max(5)
    .describe("Оценка от 1 до 5, где 1 - не подходит, 5 - отлично подходит"),
  detailedScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Детальная оценка от 0 до 100"),
  analysis: z
    .string()
    .describe("Подробный анализ кандидата на основе интервью, 3-5 предложений"),
});

// Типы
export type InterviewAnalysis = z.infer<typeof interviewAnalysisSchema>;
export type InterviewScoring = z.infer<typeof interviewScoringSchema>;
