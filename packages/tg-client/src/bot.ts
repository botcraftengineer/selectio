import { TelegramClient } from "@mtcute/bun";
import { Dispatcher } from "@mtcute/dispatcher";
import { env } from "@selectio/config";
import { createBotHandler } from "./bot-handler";
import { ExportableStorage } from "./storage";

/**
 * Запустить бота на MTProto
 * Использует пользовательский аккаунт вместо Bot API
 */
export async function startBot(): Promise<TelegramClient> {
  const apiId = env.TELEGRAM_API_ID;
  const apiHash = env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    throw new Error(
      "TELEGRAM_API_ID и TELEGRAM_API_HASH должны быть установлены",
    );
  }

  console.log("🚀 Запуск Telegram бота на MTProto...");

  // Создаем storage
  const storage = new ExportableStorage();

  // Создаем клиент
  const client = new TelegramClient({
    apiId: Number.parseInt(apiId, 10),
    apiHash,
    storage,
  });

  // Подключаемся
  await client.start();

  // Проверяем авторизацию
  const me = await client.call({
    _: "users.getUsers",
    id: [{ _: "inputUserSelf" }],
  });
  const user = me[0];

  if (!user || user._ !== "user") {
    throw new Error(
      "Не удалось получить информацию о пользователе. Возможно, требуется авторизация.",
    );
  }

  console.log(
    `✅ Бот запущен как: ${user.firstName} ${user.lastName || ""} (@${user.username || "no username"})`,
  );
  console.log(`📱 User ID: ${user.id}`);

  // Создаем dispatcher для обработки сообщений
  const dp = Dispatcher.for(client);
  const handler = createBotHandler(client);

  // Регистрируем обработчик для всех новых сообщений
  dp.onNewMessage(handler);

  console.log("👂 Слушаем входящие сообщения...");

  return client;
}

/**
 * Остановить бота
 */
export async function stopBot(_client: TelegramClient): Promise<void> {
  console.log("🛑 Остановка бота...");
  // MTCute автоматически управляет соединением
  console.log("✅ Бот остановлен");
}
