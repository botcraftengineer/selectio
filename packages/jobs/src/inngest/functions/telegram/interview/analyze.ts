import { and, db, desc, eq, telegramMessage } from "@selectio/db";
import {
  analyzeAndGenerateNextQuestion,
  createInterviewScoring,
  getInterviewContext,
  saveQuestionAnswer,
} from "../../../../services/interview-service";
import { inngest } from "../../../client";

/**
 * Основная функция для анализа интервью
 * Координирует весь процесс анализа и принимает решение о продолжении
 */
export const analyzeInterviewFunction = inngest.createFunction(
  {
    id: "analyze-interview",
    name: "Analyze Interview and Generate Next Question",
    retries: 3,
  },
  { event: "telegram/interview.analyze" },
  async ({ event, step }) => {
    const { conversationId, transcription } = event.data;

    const context = await step.run("get-interview-context", async () => {
      console.log("📋 Получение контекста интервью", {
        conversationId,
      });

      // Получаем последний вопрос из истории сообщений
      const { telegramConversation } = await import("@selectio/db");
      const [conv] = await db
        .select()
        .from(telegramConversation)
        .where(eq(telegramConversation.id, conversationId))
        .limit(1);

      if (!conv) {
        throw new Error("Conversation не найден");
      }

      // Получаем последнее сообщение от бота (это текущий вопрос)
      const lastBotMessages = await db
        .select()
        .from(telegramMessage)
        .where(
          and(
            eq(telegramMessage.conversationId, conversationId),
            eq(telegramMessage.sender, "BOT"),
          ),
        )
        .orderBy(desc(telegramMessage.createdAt))
        .limit(1);

      const lastBotMessage = lastBotMessages[0];

      const currentQuestion = lastBotMessage?.content || "Расскажи о себе";

      const ctx = await getInterviewContext(
        conversationId,
        transcription,
        currentQuestion,
      );

      if (!ctx) {
        throw new Error("Контекст интервью не найден");
      }

      return ctx;
    });

    const result = await step.run("analyze-and-generate-question", async () => {
      console.log("🤔 Анализ ответа и генерация следующего вопроса", {
        conversationId: context.conversationId,
        questionNumber: context.questionNumber,
      });

      const analysisResult = await analyzeAndGenerateNextQuestion(context);

      console.log("📊 Результат анализа", {
        shouldContinue: analysisResult.shouldContinue,
        hasQuestion: !!analysisResult.nextQuestion,
        analysis: analysisResult.analysis,
        reason: analysisResult.reason,
      });

      return analysisResult;
    });

    if (result.shouldContinue && result.nextQuestion) {
      // Отправляем событие для обработки следующего вопроса
      await step.sendEvent("send-next-question-event", {
        name: "telegram/interview.send-question",
        data: {
          conversationId: context.conversationId,
          question: result.nextQuestion,
          transcription,
          questionNumber: context.questionNumber,
        },
      });
    } else {
      // Отправляем событие для завершения интервью
      await step.sendEvent("complete-interview-event", {
        name: "telegram/interview.complete",
        data: {
          conversationId: context.conversationId,
          transcription,
          reason: result.reason ?? undefined,
          questionNumber: context.questionNumber,
          responseId: context.responseId ?? undefined,
        },
      });
    }

    return {
      success: true,
      conversationId,
      shouldContinue: result.shouldContinue,
      questionNumber: context.questionNumber,
    };
  },
);

/**
 * Функция для отправки следующего вопроса
 * Может быть запущена независимо
 */
export const sendNextQuestionFunction = inngest.createFunction(
  {
    id: "send-next-question",
    name: "Send Next Interview Question",
    retries: 3,
  },
  { event: "telegram/interview.send-question" },
  async ({ event, step }) => {
    const { conversationId, question, transcription, questionNumber } =
      event.data;

    await step.run("save-qa", async () => {
      console.log("💾 Сохранение вопроса и ответа", {
        conversationId,
        questionNumber,
      });

      // Получаем последний вопрос от бота
      const lastBotMessages = await db
        .select()
        .from(telegramMessage)
        .where(
          and(
            eq(telegramMessage.conversationId, conversationId),
            eq(telegramMessage.sender, "BOT"),
          ),
        )
        .orderBy(desc(telegramMessage.createdAt))
        .limit(1);

      const lastQuestion = lastBotMessages[0]?.content || "Первый вопрос";

      await saveQuestionAnswer(conversationId, lastQuestion, transcription);
    });

    const chatId = await step.run("get-chat-id", async () => {
      const { telegramConversation } = await import("@selectio/db");
      const [conv] = await db
        .select()
        .from(telegramConversation)
        .where(eq(telegramConversation.id, conversationId))
        .limit(1);

      if (!conv) {
        throw new Error("Conversation не найден");
      }

      console.log("📱 Получен chatId для отправки вопроса", {
        conversationId,
        chatId: conv.chatId,
      });

      return conv.chatId;
    });

    const delay = await step.run("calculate-delay", () => {
      // Умная пауза перед отправкой (имитация естественного времени набора)
      const questionLength = question.length;
      const baseDelay = 1000 + Math.random() * 1000;
      const typingDelay = questionLength * (30 + Math.random() * 20);
      const totalDelay = Math.min(baseDelay + typingDelay, 5000);

      console.log("⏳ Пауза перед отправкой вопроса", {
        delay: Math.round(totalDelay),
        questionLength,
      });

      return `${Math.round(totalDelay)}ms`;
    });

    await step.sleep("natural-delay", delay);

    await step.run("send-message", async () => {
      const [newMessage] = await db
        .insert(telegramMessage)
        .values({
          conversationId,
          sender: "BOT",
          contentType: "TEXT",
          content: question,
        })
        .returning();

      if (!newMessage) {
        throw new Error("Не удалось создать запись сообщения");
      }

      await inngest.send({
        name: "telegram/message.send",
        data: {
          messageId: newMessage.id,
          chatId,
          content: question,
        },
      });

      console.log("✅ Следующий вопрос отправлен", {
        conversationId,
        questionNumber: questionNumber + 1,
      });
    });

    return {
      success: true,
      conversationId,
      questionNumber: questionNumber + 1,
    };
  },
);

/**
 * Функция для завершения интервью и создания скоринга
 * Может быть запущена независимо
 */
export const completeInterviewFunction = inngest.createFunction(
  {
    id: "complete-interview",
    name: "Complete Interview and Create Scoring",
    retries: 3,
  },
  { event: "telegram/interview.complete" },
  async ({ event, step }) => {
    const {
      conversationId,
      transcription,
      reason,
      questionNumber,
      responseId,
    } = event.data;

    console.log("🏁 Интервью завершено", {
      conversationId,
      totalQuestions: questionNumber,
      reason,
    });

    await step.run("save-last-qa", async () => {
      console.log("💾 Сохранение последнего вопроса и ответа");

      // Получаем последний вопрос от бота
      const lastBotMessages = await db
        .select()
        .from(telegramMessage)
        .where(
          and(
            eq(telegramMessage.conversationId, conversationId),
            eq(telegramMessage.sender, "BOT"),
          ),
        )
        .orderBy(desc(telegramMessage.createdAt))
        .limit(1);

      const lastQuestion = lastBotMessages[0]?.content || "Первый вопрос";

      await saveQuestionAnswer(conversationId, lastQuestion, transcription);
    });

    if (responseId) {
      const scoringResult = await step.run("create-scoring", async () => {
        console.log("📊 Создание скоринга интервью", {
          responseId,
        });

        // Получаем последний вопрос от бота
        const lastBotMessages = await db
          .select()
          .from(telegramMessage)
          .where(
            and(
              eq(telegramMessage.conversationId, conversationId),
              eq(telegramMessage.sender, "BOT"),
            ),
          )
          .orderBy(desc(telegramMessage.createdAt))
          .limit(1);

        const lastQuestion = lastBotMessages[0]?.content || "Первый вопрос";

        const updatedContext = await getInterviewContext(
          conversationId,
          transcription,
          lastQuestion,
        );

        if (!updatedContext) {
          throw new Error("Не удалось получить обновленный контекст");
        }

        const scoring = await createInterviewScoring(updatedContext);

        console.log("✅ Скоринг создан", {
          score: scoring.score,
          detailedScore: scoring.detailedScore,
        });

        const { telegramInterviewScoring } = await import("@selectio/db");
        await db
          .insert(telegramInterviewScoring)
          .values({
            conversationId,
            responseId,
            score: scoring.score,
            detailedScore: scoring.detailedScore,
            analysis: scoring.analysis,
          })
          .onConflictDoUpdate({
            target: telegramInterviewScoring.conversationId,
            set: {
              score: scoring.score,
              detailedScore: scoring.detailedScore,
              analysis: scoring.analysis,
            },
          });

        console.log("✅ Скоринг интервью сохранен в БД");

        return scoring;
      });

      await step.run("finalize-response-status", async () => {
        console.log("🔄 Финализация статуса response", {
          responseId,
          score: scoringResult.score,
          detailedScore: scoringResult.detailedScore,
        });

        const { vacancyResponse } = await import("@selectio/db");

        // Определяем hrSelectionStatus на основе оценки
        // Если detailedScore >= 70, то RECOMMENDED, иначе NOT_RECOMMENDED
        const hrSelectionStatus =
          scoringResult.detailedScore >= 70 ? "RECOMMENDED" : "NOT_RECOMMENDED";

        await db
          .update(vacancyResponse)
          .set({
            status: "COMPLETED",
            hrSelectionStatus,
          })
          .where(eq(vacancyResponse.id, responseId));

        console.log("✅ Статус обновлен", {
          status: "COMPLETED",
          hrSelectionStatus,
          detailedScore: scoringResult.detailedScore,
        });
      });
    }

    const chatId = await step.run("get-chat-id", async () => {
      const { telegramConversation } = await import("@selectio/db");
      const [conv] = await db
        .select()
        .from(telegramConversation)
        .where(eq(telegramConversation.id, conversationId))
        .limit(1);

      if (!conv) {
        throw new Error("Conversation не найден");
      }

      console.log("📱 Получен chatId для финального сообщения", {
        conversationId,
        chatId: conv.chatId,
      });

      return conv.chatId;
    });

    await step.run("send-final-message", async () => {
      const finalMessages = [
        "Отлично, спасибо за развернутые ответы! 🙏 Мне нужно время, чтобы все проанализировать. Свяжусь с тобой в ближайшее время с результатами.",
        "Супер, благодарю за беседу! Я изучу все детали и вернусь с обратной связью. Держу в курсе! 😊",
        "Спасибо большое за уделенное время! Сейчас обработаю информацию и скоро выйду на связь с решением.",
        "Отлично пообщались, спасибо! 👍 Мне нужно проанализировать наш разговор, после чего я с тобой свяжусь.",
        "Благодарю за ответы! Все записал, теперь изучу детали. Скоро вернусь с фидбеком.",
      ] as const;

      const finalMessage =
        finalMessages[Math.floor(Math.random() * finalMessages.length)] as string;

      const [newMessage] = await db
        .insert(telegramMessage)
        .values({
          conversationId,
          sender: "BOT",
          contentType: "TEXT",
          content: finalMessage,
        })
        .returning();

      if (!newMessage) {
        throw new Error("Не удалось создать запись сообщения");
      }

      await inngest.send({
        name: "telegram/message.send",
        data: {
          messageId: newMessage.id,
          chatId,
          content: finalMessage,
        },
      });

      console.log("✅ Финальное сообщение отправлено");
    });

    return {
      success: true,
      conversationId,
      totalQuestions: questionNumber,
    };
  },
);
