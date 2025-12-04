import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import { telegramConversation } from "@selectio/db/schema";
import {
  buildInterviewQuestionPrompt,
  buildInterviewScoringPrompt,
} from "@selectio/prompts";
import { stripHtml } from "string-strip-html";
import { generateText } from "../lib/ai-client";
import {
  type InterviewAnalysis,
  type InterviewScoring,
  interviewAnalysisSchema,
  interviewScoringSchema,
} from "../schemas/interview";
import { extractJsonFromText } from "../utils/json-extractor";

interface InterviewContext {
  conversationId: string;
  candidateName: string | null;
  vacancyTitle: string | null;
  vacancyDescription: string | null;
  currentAnswer: string;
  currentQuestion: string;
  previousQA: Array<{ question: string; answer: string }>;
  questionNumber: number;
  responseId: string | null;
}

/**
 * Анализирует ответ кандидата и генерирует следующий вопрос
 */
export async function analyzeAndGenerateNextQuestion(
  context: InterviewContext,
): Promise<InterviewAnalysis> {
  const {
    questionNumber,
    currentAnswer,
    currentQuestion,
    previousQA,
    candidateName,
    vacancyTitle,
  } = context;

  // Максимум 4 вопроса
  if (questionNumber >= 4) {
    return {
      analysis: "Достигнут максимум вопросов",
      shouldContinue: false,
      reason: "Достигнут лимит вопросов",
    };
  }

  const prompt = buildInterviewQuestionPrompt({
    candidateName,
    vacancyTitle,
    currentAnswer,
    currentQuestion,
    previousQA,
    questionNumber,
  });

  const { text } = await generateText({
    prompt,
    temperature: 0.8,
    generationName: "interview-next-question",
    entityId: context.conversationId,
    metadata: {
      conversationId: context.conversationId,
      questionNumber,
    },
  });

  // Парсим JSON ответ
  try {
    const extracted = extractJsonFromText(text);

    if (!extracted) {
      throw new Error("JSON не найден в ответе");
    }

    const result = interviewAnalysisSchema.parse(extracted);

    return {
      ...result,
      shouldContinue: result.shouldContinue && questionNumber < 4,
    };
  } catch (error) {
    console.error("Ошибка парсинга ответа AI:", error);
    console.error("Ответ AI:", text);

    // Fallback: пытаемся продолжить с дефолтным вопросом
    return {
      analysis: "Не удалось проанализировать ответ",
      shouldContinue: questionNumber < 4,
      nextQuestion: "Расскажи подробнее о своем опыте",
    };
  }
}

/**
 * Получает контекст интервью из базы данных
 */
export async function getInterviewContext(
  conversationId: string,
  currentTranscription: string,
  currentQuestion: string,
): Promise<InterviewContext | null> {
  const conversation = await db.query.telegramConversation.findFirst({
    where: eq(telegramConversation.id, conversationId),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      },
      response: {
        with: {
          vacancy: true,
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  // Парсим metadata
  let metadata: Record<string, unknown> = {};
  try {
    metadata = conversation.metadata ? JSON.parse(conversation.metadata) : {};
  } catch (e) {
    console.error("Ошибка парсинга metadata:", e);
  }

  const questionAnswers =
    (metadata.questionAnswers as Array<{
      question: string;
      answer: string;
    }>) || [];

  return {
    conversationId: conversation.id,
    candidateName: conversation.candidateName,
    vacancyTitle: conversation.response?.vacancy?.title || null,
    vacancyDescription: conversation.response?.vacancy?.description
      ? stripHtml(conversation.response.vacancy.description).result
      : null,
    currentAnswer: currentTranscription,
    currentQuestion,
    previousQA: questionAnswers,
    questionNumber: questionAnswers.length + 1,
    responseId: conversation.responseId || null,
  };
}

/**
 * Сохраняет вопрос и ответ в metadata разговора
 */
export async function saveQuestionAnswer(
  conversationId: string,
  question: string,
  answer: string,
) {
  const [conversation] = await db
    .select()
    .from(telegramConversation)
    .where(eq(telegramConversation.id, conversationId))
    .limit(1);

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  let metadata: Record<string, unknown> = {};
  try {
    metadata = conversation.metadata ? JSON.parse(conversation.metadata) : {};
  } catch (e) {
    console.error("Ошибка парсинга metadata:", e);
  }

  const questionAnswers =
    (metadata.questionAnswers as Array<{
      question: string;
      answer: string;
    }>) || [];

  questionAnswers.push({ question, answer });
  metadata.questionAnswers = questionAnswers;

  await db
    .update(telegramConversation)
    .set({ metadata: JSON.stringify(metadata) })
    .where(eq(telegramConversation.id, conversationId));
}

/**
 * Создает финальный скоринг на основе всего интервью
 */
export async function createInterviewScoring(
  context: InterviewContext,
): Promise<InterviewScoring> {
  const { candidateName, vacancyTitle, vacancyDescription, previousQA } =
    context;

  const prompt = buildInterviewScoringPrompt({
    candidateName,
    vacancyTitle,
    vacancyDescription,
    previousQA,
  });

  const { text } = await generateText({
    prompt,
    temperature: 0.3,
    generationName: "interview-scoring",
    entityId: context.conversationId,
    metadata: {
      conversationId: context.conversationId,
      responseId: context.responseId,
    },
  });

  // Парсим JSON ответ
  try {
    const extracted = extractJsonFromText(text);

    if (!extracted) {
      throw new Error("JSON не найден в ответе");
    }

    const result = interviewScoringSchema.parse(extracted);

    return result;
  } catch (error) {
    console.error("Ошибка парсинга скоринга:", error);
    console.error("Ответ AI:", text);

    // Fallback: возвращаем средние значения
    return {
      score: 3,
      detailedScore: 50,
      analysis: "Не удалось проанализировать интервью автоматически",
    };
  }
}
