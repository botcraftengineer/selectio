import { db, eq, telegramMessage } from "@selectio/db";
import {
  analyzeAndGenerateNextQuestion,
  createInterviewScoring,
  getInterviewContext,
  saveQuestionAnswer,
} from "../services/interview-service";
import { inngest } from "./client";

/**
 * Inngest функция для анализа интервью и генерации следующего вопроса
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

      const ctx = await getInterviewContext(conversationId, transcription);

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
      await step.run("send-next-question", async () => {
        // Сохраняем вопрос и ответ
        const lastQA = context.previousQA[context.previousQA.length - 1];
        const lastQuestion =
          context.previousQA.length > 0 && lastQA
            ? lastQA.question
            : "Первый вопрос";

        await saveQuestionAnswer(
          context.conversationId,
          lastQuestion,
          transcription,
        );

        // Получаем conversation для chatId
        const { telegramConversation } = await import("@selectio/db");
        const [conv] = await db
          .select()
          .from(telegramConversation)
          .where(eq(telegramConversation.id, context.conversationId))
          .limit(1);

        if (!conv) {
          throw new Error("Conversation не найден");
        }

        if (!result.nextQuestion) {
          throw new Error("Следующий вопрос не сгенерирован");
        }

        // Умная пауза перед отправкой (имитация естественного времени набора)
        const questionLength = result.nextQuestion.length;
        // Базовая пауза 1-2 секунды + ~30-50мс на символ
        const baseDelay = 1000 + Math.random() * 1000;
        const typingDelay = questionLength * (30 + Math.random() * 20);
        const totalDelay = Math.min(baseDelay + typingDelay, 5000); // Максимум 5 секунд

        console.log("⏳ Пауза перед отправкой вопроса", {
          delay: Math.round(totalDelay),
          questionLength,
        });

        await new Promise((resolve) => setTimeout(resolve, totalDelay));

        // Создаем запись сообщения в БД
        const [newMessage] = await db
          .insert(telegramMessage)
          .values({
            conversationId: context.conversationId,
            sender: "BOT",
            contentType: "TEXT",
            content: result.nextQuestion,
          })
          .returning();

        if (!newMessage) {
          throw new Error("Не удалось создать запись сообщения");
        }

        // Отправляем следующий вопрос через Inngest
        await inngest.send({
          name: "telegram/message.send",
          data: {
            messageId: newMessage.id,
            chatId: conv.chatId,
            content: result.nextQuestion,
          },
        });

        console.log("✅ Следующий вопрос отправлен", {
          conversationId: context.conversationId,
          questionNumber: context.questionNumber + 1,
        });
      });
    } else {
      await step.run("complete-interview", async () => {
        console.log("🏁 Интервью завершено", {
          conversationId: context.conversationId,
          totalQuestions: context.questionNumber,
          reason: result.reason,
        });

        // Сохраняем последний вопрос и ответ
        const lastQA = context.previousQA[context.previousQA.length - 1];
        const lastQuestion =
          context.previousQA.length > 0 && lastQA
            ? lastQA.question
            : "Первый вопрос";

        await saveQuestionAnswer(
          context.conversationId,
          lastQuestion,
          transcription,
        );

        // Создаем скоринг на основе интервью
        if (context.responseId) {
          console.log("📊 Создание скоринга интервью", {
            responseId: context.responseId,
          });

          // Обновляем контекст с последним ответом
          const updatedContext = await getInterviewContext(
            context.conversationId,
            transcription,
          );

          if (updatedContext) {
            const scoring = await createInterviewScoring(updatedContext);

            console.log("✅ Скоринг создан", {
              score: scoring.score,
              detailedScore: scoring.detailedScore,
            });

            // Сохраняем скоринг интервью в отдельную таблицу
            const { telegramInterviewScoring } = await import("@selectio/db");
            await db
              .insert(telegramInterviewScoring)
              .values({
                conversationId: context.conversationId,
                responseId: context.responseId,
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
          }
        }

        // Получаем conversation для chatId
        const { telegramConversation } = await import("@selectio/db");
        const [conv] = await db
          .select()
          .from(telegramConversation)
          .where(eq(telegramConversation.id, context.conversationId))
          .limit(1);

        if (!conv) {
          throw new Error("Conversation не найден");
        }

        const finalMessage =
          "Спасибо за ответы! 🙏 Я изучу их и свяжусь с тобой в ближайшее время.";

        // Создаем запись сообщения в БД
        const [newMessage] = await db
          .insert(telegramMessage)
          .values({
            conversationId: context.conversationId,
            sender: "BOT",
            contentType: "TEXT",
            content: finalMessage,
          })
          .returning();

        if (!newMessage) {
          throw new Error("Не удалось создать запись сообщения");
        }

        // Отправляем финальное сообщение
        await inngest.send({
          name: "telegram/message.send",
          data: {
            messageId: newMessage.id,
            chatId: conv.chatId,
            content: finalMessage,
          },
        });
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
