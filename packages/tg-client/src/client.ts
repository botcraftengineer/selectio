import { TelegramClient } from "@mtcute/bun";
import { MemoryStorage } from "@mtcute/core";
import { env } from "@selectio/config";

const API_ID = Number.parseInt(env.TELEGRAM_API_ID || "0", 10);
const API_HASH = env.TELEGRAM_API_HASH || "";
const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || "";
if (!API_ID || !API_HASH || !BOT_TOKEN) {
  throw new Error(
    "TELEGRAM_API_ID, TELEGRAM_API_HASH и TELEGRAM_BOT_TOKEN должны быть установлены",
  );
}

// Создаем клиент для отправки сообщений
export const tg = new TelegramClient({
  apiId: API_ID,
  apiHash: API_HASH,
  storage: new MemoryStorage(),
});

// Инициализация клиента
let isInitialized = false;

export async function initClient() {
  if (isInitialized) return;

  try {
    await tg.start({
      botToken: BOT_TOKEN,
    });
    isInitialized = true;
    console.log("✅ MTCute клиент инициализирован");
  } catch (error) {
    console.error("❌ Ошибка инициализации MTCute клиента:", error);
    throw error;
  }
}

/**
 * Отправить сообщение пользователю по username
 * @param username - Username пользователя (с @ или без)
 * @param text - Текст сообщения
 */
export async function sendMessageByUsername(
  username: string,
  text: string,
): Promise<{ success: boolean; message: string; chatId?: string }> {
  try {
    await initClient();

    // Убираем @ если есть
    const cleanUsername = username.startsWith("@")
      ? username.slice(1)
      : username;
    console.log("cleanUsername", cleanUsername);
    // Отправляем сообщение
    const result = await tg.sendText("BotCraftEngineer", text);

    return {
      success: true,
      message: "Сообщение отправлено",
      chatId: result.chat.id.toString(),
    };
  } catch (error) {
    console.error("Ошибка отправки сообщения:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Неизвестная ошибка",
    };
  }
}

/**
 * Проверить существование пользователя по username
 */
export async function checkUsername(
  username: string,
): Promise<{ exists: boolean; chatId?: string }> {
  try {
    await initClient();

    const cleanUsername = username.startsWith("@")
      ? username.slice(1)
      : username;

    const peer = await tg.resolvePeer(cleanUsername);

    return {
      exists: true,
      chatId: String(peer),
    };
  } catch {
    return {
      exists: false,
    };
  }
}
