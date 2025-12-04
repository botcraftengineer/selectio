import { db, eq } from "@selectio/db";
import {
  telegramConversation,
  telegramMessage,
  telegramSession,
  vacancyResponse,
} from "@selectio/db/schema";
import { tgClientSDK } from "@selectio/tg-client/sdk";
import { generateWelcomeMessage } from "../../../services/candidate-welcome-service";
import { sendHHChatMessage } from "../../../services/hh-chat-service";
import { inngest } from "../../client";

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
        // Получаем активную сессию для workspace
        const workspaceId = response.vacancy.workspaceId;
        const session = await db.query.telegramSession.findFirst({
          where: eq(telegramSession.workspaceId, workspaceId),
          orderBy: (sessions, { desc }) => [desc(sessions.lastUsedAt)],
        });

        if (!session) {
          throw new Error(
            `Нет активной Telegram сессии для workspace ${workspaceId}`,
          );
        }

        let sendResult: {
          success: boolean;
          messageId: string;
          chatId: string;
          senderId?: string;
        } | null = null;

        // Пытаемся отправить по username, если он есть
        if (username) {
          console.log(`📨 Попытка отправки по username: @${username}`);
          try {
            sendResult = await tgClientSDK.sendMessageByUsername({
              apiId: Number.parseInt(session.apiId, 10),
              apiHash: session.apiHash,
              sessionData: session.sessionData as Record<string, string>,
              username,
              text: welcomeMessage,
            });

            console.log("✅ Сообщение отправлено по username", {
              responseId,
              username,
              chatId: sendResult.chatId,
            });

            // Обновляем lastUsedAt
            await db
              .update(telegramSession)
              .set({ lastUsedAt: new Date() })
              .where(eq(telegramSession.id, session.id));

            return sendResult;
          } catch (error) {
            console.log(
              `⚠️ Не удалось отправить по username: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }

        // Если username не сработал или его нет, пробуем по телефону
        if (phone) {
          console.log(`📞 Попытка отправки по номеру телефона: ${phone}`);
          try {
            sendResult = await tgClientSDK.sendMessageByPhone({
              apiId: Number.parseInt(session.apiId, 10),
              apiHash: session.apiHash,
              sessionData: session.sessionData as Record<string, string>,
              phone,
              text: welcomeMessage,
              firstName: response.candidateName || undefined,
            });

            console.log("✅ Сообщение отправлено по номеру телефона", {
              responseId,
              phone,
              chatId: sendResult.chatId,
            });

            // Обновляем lastUsedAt
            await db
              .update(telegramSession)
              .set({ lastUsedAt: new Date() })
              .where(eq(telegramSession.id, session.id));

            return sendResult;
          } catch (error) {
            console.log(
              `⚠️ Не удалось отправить по телефону: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }

        // Если Telegram не сработал, пробуем hh.ru
        if (!sendResult) {
          console.log(`📧 Попытка отправки через hh.ru`);

          const hhResult = await sendHHChatMessage({
            workspaceId: response.vacancy.workspaceId,
            responseId,
            text: welcomeMessage,
          });

          if (hhResult.success) {
            console.log(`✅ Сообщение отправлено через hh.ru`);

            // Обновляем статус отправки приветствия
            await db
              .update(vacancyResponse)
              .set({
                welcomeSentAt: new Date(),
              })
              .where(eq(vacancyResponse.id, responseId));

            return {
              success: true,
              messageId: "",
              chatId: response.chatId || "",
              method: "hh",
            };
          }

          console.error(
            `❌ Не удалось отправить через hh.ru: ${hhResult.error}`,
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
              senderId: "senderId" in result ? result.senderId : result.chatId,
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
                senderId:
                  "senderId" in result ? result.senderId : result.chatId,
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

      await step.run("update-response-status", async () => {
        console.log("🔄 Обновление статуса response на INTERVIEW_HH", {
          responseId,
        });

        await db
          .update(vacancyResponse)
          .set({ status: "INTERVIEW_HH" })
          .where(eq(vacancyResponse.id, responseId));

        console.log("✅ Статус обновлен на INTERVIEW_HH");
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
