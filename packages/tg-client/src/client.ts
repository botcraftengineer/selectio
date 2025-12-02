import { TelegramClient } from "@mtcute/bun";
import { Long, MemoryStorage } from "@mtcute/core";
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
 * Отправить сообщение пользователю по номеру телефона
 * Добавляет контакт в Telegram и отправляет сообщение
 * @param phone - Номер телефона в международном формате (например, +79991234567)
 * @param text - Текст сообщения
 * @param firstName - Имя контакта (опционально)
 */
export async function sendMessageByPhone(
  phone: string,
  text: string,
  firstName?: string,
): Promise<{ success: boolean; message: string; chatId?: string }> {
  try {
    await initClient();

    // Очищаем номер телефона от лишних символов
    const cleanPhone = phone.replace(/[^\d+]/g, "");

    // Проверяем формат номера
    if (!cleanPhone.startsWith("+")) {
      return {
        success: false,
        message:
          "Номер телефона должен быть в международном формате (начинаться с +)",
      };
    }

    console.log(`📞 Попытка отправки сообщения по номеру: ${cleanPhone}`);

    // Импортируем контакт в Telegram
    const importResult = await tg.call({
      _: "contacts.importContacts",
      contacts: [
        {
          _: "inputPhoneContact",
          clientId: Long.fromNumber(Date.now()),
          phone: cleanPhone,
          firstName: firstName || "Кандидат",
          lastName: "",
        },
      ],
    });

    // Проверяем результат импорта
    if (!importResult.users || importResult.users.length === 0) {
      console.log(
        `⚠️ Пользователь с номером ${cleanPhone} не найден в Telegram`,
      );
      return {
        success: false,
        message: "Пользователь с таким номером телефона не найден в Telegram",
      };
    }

    const user = importResult.users[0];
    if (!user || user._ !== "user") {
      return {
        success: false,
        message: "Не удалось получить данные пользователя",
      };
    }

    console.log(`✅ Контакт импортирован: ${user.id}`);

    // Отправляем сообщение
    const result = await tg.sendText(user.id, text);

    return {
      success: true,
      message: "Сообщение отправлено",
      chatId: result.chat.id.toString(),
    };
  } catch (error) {
    console.error("❌ Ошибка отправки сообщения по телефону:", error);
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
