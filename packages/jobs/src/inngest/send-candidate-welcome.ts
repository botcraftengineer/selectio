import { db, eq } from "@selectio/db";
import {
  telegramConversation,
  telegramMessage,
  vacancyResponse,
} from "@selectio/db/schema";
import { sendMessageByPhone, sendMessageByUsername } from "@selectio/tg-client";
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
    const { responseId, username, phone } = event.data;

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
        phone,
      });

      try {
        let sendResult:
          | { success: boolean; message: string; chatId?: string }
          | undefined;

        // Пытаемся отправить по username, если он есть
        if (username) {
          console.log(`📨 Попытка отправки по username: @${username}`);
          sendResult = await sendMessageByUsername(username, welcomeMessage);

          if (sendResult.success) {
            console.log("✅ Сообщение отправлено по username", {
              responseId,
              username,
              chatId: sendResult.chatId,
            });
            return sendResult;
          }

          console.log(
            `⚠️ Не удалось отправить по username: ${sendResult.message}`,
          );
        }

        // Если username не сработал или его нет, пробуем по телефону
        if (phone) {
          console.log(`📞 Попытка отправки по номеру телефона: ${phone}`);
          sendResult = await sendMessageByPhone(
            phone,
            welcomeMessage,
            response.candidateName || undefined,
          );

          if (sendResult.success) {
            console.log("✅ Сообщение отправлено по номеру телефона", {
              responseId,
              phone,
              chatId: sendResult.chatId,
            });
            return sendResult;
          }

          console.log(
            `⚠️ Не удалось отправить по телефону: ${sendResult.message}`,
          );
        }

        // Если ничего не сработало
        throw new Error(
          username && phone
            ? `Не удалось отправить сообщение ни по username (@${username}), ни по телефону (${phone})`
            : username
              ? `Не удалось отправить сообщение по username (@${username}), телефон не указан`
              : phone
                ? `Username не указан, не удалось отправить по телефону (${phone})`
                : "Не указаны ни username, ни телефон",
        );
      } catch (error) {
        console.error("❌ Ошибка отправки сообщения в Telegram", {
          responseId,
          username,
          phone,
          error,
        });
        throw error;
      }
    });

    // Если получили chatId, сохраняем в базу
    if (result.chatId) {
      const chatId = result.chatId;
      await step.run("save-conversation", async () => {
        const [conversation] = await db
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
              }),
            },
          })
          .returning();

        console.log(`✅ Сохранена беседа с chatId: ${chatId}`);

        // Сохраняем приветственное сообщение в историю
        if (conversation) {
          await db.insert(telegramMessage).values({
            conversationId: conversation.id,
            sender: "BOT",
            contentType: "TEXT",
            content: welcomeMessage,
          });

          console.log(`✅ Приветственное сообщение сохранено в историю`);
        }
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
