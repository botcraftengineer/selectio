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
 * Inngest функция для массовой отправки приветственных сообщений кандидатам
 * Использует batch events для эффективной обработки множества откликов
 */
export const sendCandidateWelcomeBatchFunction = inngest.createFunction(
  {
    id: "send-candidate-welcome-batch",
    name: "Send Candidate Welcome Messages (Batch)",
    batchEvents: {
      maxSize: 4,
      timeout: "10s",
    },
  },
  { event: "candidate/welcome.batch" },
  async ({ events, step }) => {
    console.log(
      `🚀 Запуск массовой отправки приветствий для ${events.length} событий`,
    );

    // Собираем все responseIds из всех событий
    const allResponseIds = events.flatMap((evt) => evt.data.responseIds);

    console.log(`📋 Всего откликов для обработки: ${allResponseIds.length}`);

    // Получаем данные откликов с username или телефоном
    const responses = await step.run("fetch-responses", async () => {
      const results = await db.query.vacancyResponse.findMany({
        where: (fields, { inArray }) => inArray(fields.id, allResponseIds),
        columns: {
          id: true,
          telegramUsername: true,
          phone: true,
          candidateName: true,
          vacancyId: true,
        },
      });

      console.log(`✅ Найдено откликов в БД: ${results.length}`);
      return results;
    });

    // Фильтруем отклики с username или телефоном
    const responsesWithContact = responses.filter(
      (r) => r.telegramUsername || r.phone,
    );
    const skippedCount = responses.length - responsesWithContact.length;

    console.log(
      `📤 Отклики с контактами: ${responsesWithContact.length}, пропущено: ${skippedCount}`,
    );

    // Обрабатываем каждый отклик
    const results = await Promise.allSettled(
      responsesWithContact.map(async (response) => {
        return await step.run(`send-welcome-${response.id}`, async () => {
          try {
            // Генерируем приветственное сообщение
            const welcomeMessage = await generateWelcomeMessage(response.id);

            let sendResult:
              | { success: boolean; message: string; chatId?: string }
              | undefined;

            // Пытаемся отправить по username, если он есть
            if (response.telegramUsername) {
              console.log(
                `📨 Попытка отправки по username: @${response.telegramUsername}`,
              );
              sendResult = await sendMessageByUsername(
                response.telegramUsername,
                welcomeMessage,
              );

              if (!sendResult.success && response.phone) {
                console.log(
                  `⚠️ Не удалось отправить по username, пробуем по телефону`,
                );
              }
            }

            // Если username не сработал или его нет, пробуем по телефону
            if ((!sendResult || !sendResult.success) && response.phone) {
              console.log(
                `📞 Попытка отправки по номеру телефона: ${response.phone}`,
              );
              sendResult = await sendMessageByPhone(
                response.phone,
                welcomeMessage,
                response.candidateName || undefined,
              );
            }

            if (!sendResult || !sendResult.success) {
              throw new Error(
                sendResult?.message || "Не удалось отправить сообщение",
              );
            }

            // Сохраняем беседу если получили chatId
            if (sendResult.chatId) {
              const [conversation] = await db
                .insert(telegramConversation)
                .values({
                  chatId: sendResult.chatId,
                  responseId: response.id,
                  candidateName: response.candidateName,
                  status: "ACTIVE",
                  metadata: JSON.stringify({
                    responseId: response.id,
                    vacancyId: response.vacancyId,
                    username: response.telegramUsername,
                  }),
                })
                .onConflictDoUpdate({
                  target: telegramConversation.chatId,
                  set: {
                    responseId: response.id,
                    candidateName: response.candidateName,
                    status: "ACTIVE",
                    metadata: JSON.stringify({
                      responseId: response.id,
                      vacancyId: response.vacancyId,
                      username: response.telegramUsername,
                    }),
                  },
                })
                .returning();

              // Сохраняем приветственное сообщение в историю
              if (conversation) {
                await db.insert(telegramMessage).values({
                  conversationId: conversation.id,
                  sender: "BOT",
                  contentType: "TEXT",
                  content: welcomeMessage,
                });
              }
            }

            // Обновляем статус отправки приветствия
            await db
              .update(vacancyResponse)
              .set({
                welcomeSentAt: new Date(),
              })
              .where(eq(vacancyResponse.id, response.id));

            console.log(
              `✅ Приветствие отправлено: ${response.id} (@${response.telegramUsername})`,
            );

            return {
              responseId: response.id,
              username: response.telegramUsername,
              chatId: sendResult.chatId,
              success: true,
            };
          } catch (error) {
            console.error(
              `❌ Ошибка отправки приветствия для ${response.id}:`,
              error,
            );
            return {
              responseId: response.id,
              username: response.telegramUsername,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        });
      }),
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `✅ Завершено: успешно ${successful}, ошибок ${failed}, пропущено ${skippedCount}`,
    );

    return {
      success: true,
      total: allResponseIds.length,
      sent: successful,
      failed,
      skipped: skippedCount,
    };
  },
);
