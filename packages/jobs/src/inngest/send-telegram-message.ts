import { db, eq, telegramMessage } from "@selectio/db";
import { sendMessage } from "@selectio/telegram-bot";
import { inngest } from "./client";

/**
 * Inngest функция для отправки сообщения в Telegram
 */
export const sendTelegramMessageFunction = inngest.createFunction(
  {
    id: "send-telegram-message",
    name: "Send Telegram Message",
    retries: 3,
  },
  { event: "telegram/message.send" },
  async ({ event, step }) => {
    const { messageId, chatId, content } = event.data;

    const result = await step.run("send-telegram-message", async () => {
      console.log("📤 Отправка сообщения в Telegram", {
        messageId,
        chatId,
      });

      try {
        const sentMessage = await sendMessage(chatId, content);
        const telegramMessageId = String(sentMessage.message_id);

        console.log("✅ Сообщение отправлено в Telegram", {
          messageId,
          chatId,
          telegramMessageId,
        });

        return { telegramMessageId };
      } catch (error) {
        console.error("❌ Ошибка отправки сообщения в Telegram", {
          messageId,
          chatId,
          error,
        });
        throw error;
      }
    });

    // Обновляем запись в базе данных с telegramMessageId
    await step.run("update-message-record", async () => {
      await db
        .update(telegramMessage)
        .set({
          telegramMessageId: result.telegramMessageId,
        })
        .where(eq(telegramMessage.id, messageId));

      console.log("✅ Обновлена запись сообщения в БД", {
        messageId,
        telegramMessageId: result.telegramMessageId,
      });
    });

    return {
      success: true,
      messageId,
      chatId,
      telegramMessageId: result.telegramMessageId,
    };
  },
);
