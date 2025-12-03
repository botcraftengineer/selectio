import { db, eq } from "@selectio/db";
import {
  telegramConversation,
  telegramMessage,
  telegramSession,
  vacancyResponse,
} from "@selectio/db/schema";
import { tgClientSDK } from "@selectio/tg-client/sdk";
import { generateWelcomeMessage } from "../services/candidate-welcome-service";
import {
  extractChatIdFromResumeUrl,
  sendHHChatMessage,
} from "../services/hh-chat-service";
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
          resumeUrl: true,
        },
        with: {
          vacancy: {
            columns: {
              workspaceId: true,
            },
          },
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

            // Генерируем приветственное сообщение
            const welcomeMessage = await generateWelcomeMessage(response.id);

            let sendResult: {
              success: boolean;
              messageId: string;
              chatId: string;
            } | null = null;

            // Пытаемся отправить по username, если он есть
            if (response.telegramUsername) {
              console.log(
                `📨 Попытка отправки по username: @${response.telegramUsername}`,
              );
              try {
                sendResult = await tgClientSDK.sendMessageByUsername({
                  apiId: Number.parseInt(session.apiId, 10),
                  apiHash: session.apiHash,
                  sessionData: session.sessionData as Record<string, string>,
                  username: response.telegramUsername,
                  text: welcomeMessage,
                });
              } catch (_error) {
                if (response.phone) {
                  console.log(
                    `⚠️ Не удалось отправить по username, пробуем по телефону`,
                  );
                }
              }
            }

            // Если username не сработал или его нет, пробуем по телефону
            if (!sendResult && response.phone) {
              console.log(
                `📞 Попытка отправки по номеру телефона: ${response.phone}`,
              );
              sendResult = await tgClientSDK.sendMessageByPhone({
                apiId: Number.parseInt(session.apiId, 10),
                apiHash: session.apiHash,
                sessionData: session.sessionData as Record<string, string>,
                phone: response.phone,
                text: welcomeMessage,
                firstName: response.candidateName || undefined,
              });
            }

            // Если не удалось отправить через Telegram, пробуем через hh.ru
            if (!sendResult && response.resumeUrl) {
              console.log(`📧 Попытка отправки через hh.ru`);

              const chatId = extractChatIdFromResumeUrl(response.resumeUrl);

              if (chatId) {
                const hhResult = await sendHHChatMessage({
                  workspaceId,
                  chatId,
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
                    .where(eq(vacancyResponse.id, response.id));

                  return {
                    responseId: response.id,
                    username: response.telegramUsername,
                    chatId,
                    success: true,
                    method: "hh",
                  };
                }

                console.error(
                  `❌ Не удалось отправить через hh.ru: ${hhResult.error}`,
                );
              } else {
                console.error(`❌ Не удалось извлечь chatId из resumeUrl`);
              }
            }

            if (!sendResult) {
              throw new Error("Не удалось отправить сообщение");
            }

            // Обновляем lastUsedAt для сессии
            await db
              .update(telegramSession)
              .set({ lastUsedAt: new Date() })
              .where(eq(telegramSession.id, session.id));

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
              method: "telegram",
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
