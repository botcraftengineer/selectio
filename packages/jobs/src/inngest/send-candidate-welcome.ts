import { db, eq } from "@selectio/db";
import {
  responseScreening,
  telegramConversation,
  vacancyResponse,
} from "@selectio/db/schema";
import { sendMessageByUsername } from "@selectio/telegram-bot";
import { generateWelcomeMessage } from "../services/candidate-welcome-service";
import { inngest } from "./client";

/**
 * Inngest функция для отправки приветственного сообщения кандидату в Telegram по username
 */
export const sendCandidateWelcomeFunction = inngest.createFunction(
  {
    id: "send-candidate-welcome",
    name: "Send Candidate Welcome Message",
    retries: 3,
  },
  { event: "candidate/welcome" },
  async ({ event, step }) => {
    const { responseId, username } = event.data;

    // Получаем данные отклика
    const response = await step.run("fetch-response-data", async () => {
      const result = await db.query.vacancyResponse.findFirst({
        where: eq(vacancyResponse.id, responseId),
        with: {
          vacancy: true,
        },
      });

      if (!result) {
        throw new Error(`Отклик не найден: ${responseId}`);
      }

      return result;
    });

    const welcomeMessage = await step.run(
      "generate-welcome-message",
      async () => {
        console.log("🤖 Генерация приветственного сообщения", {
          responseId,
          username,
        });

        try {
          const message = await generateWelcomeMessage(responseId);

          console.log("✅ Сообщение сгенерировано", {
            responseId,
            messageLength: message.length,
          });

          return message;
        } catch (error) {
          console.error("❌ Ошибка генерации приветствия", {
            responseId,
            error,
          });
          throw error;
        }
      },
    );

    const result = await step.run("send-telegram-message", async () => {
      console.log("📤 Отправка сообщения пользователю", {
        responseId,
        username,
      });

      try {
        const sendResult = await sendMessageByUsername(
          username,
          welcomeMessage,
        );

        if (!sendResult.success) {
          throw new Error(sendResult.message);
        }

        console.log("✅ Сообщение отправлено", {
          responseId,
          username,
          chatId: sendResult.chatId,
        });

        return sendResult;
      } catch (error) {
        console.error("❌ Ошибка отправки сообщения в Telegram", {
          responseId,
          username,
          error,
        });
        throw error;
      }
    });

    // Если получили chatId, сохраняем в базу
    if (result.chatId) {
      const chatId = result.chatId;
      await step.run("save-conversation", async () => {
        // Получаем скрининг для определения количества вопросов
        const screening = await db.query.responseScreening.findFirst({
          where: eq(vacancyResponse.id, responseId),
        });

        const questions = (screening?.questions as string[]) || [];

        await db
          .insert(telegramConversation)
          .values({
            chatId,
            responseId,
            candidateName: response.candidateName,
            status: "ACTIVE",
            metadata: JSON.stringify({
              responseId,
              vacancyId: response.vacancyId,
              username,
              totalQuestions: questions.length,
              questionAnswers: [],
            }),
          })
          .onConflictDoUpdate({
            target: telegramConversation.chatId,
            set: {
              responseId,
              candidateName: response.candidateName,
              status: "ACTIVE",
              metadata: JSON.stringify({
                responseId,
                vacancyId: response.vacancyId,
                username,
                totalQuestions: questions.length,
                questionAnswers: [],
              }),
            },
          });

        console.log(`✅ Сохранена беседа с chatId: ${chatId}`);
      });
    }

    return {
      success: true,
      responseId,
      username,
      chatId: result.chatId,
      messageSent: true,
    };
  },
);
