import { TelegramClient } from "@mtcute/bun";
import { getIntegrationCredentials } from "@selectio/db";
import { ExportableStorage } from "./storage";

// Кэш клиентов по workspaceId
const clientCache = new Map<string, TelegramClient>();

/**
 * Получить или создать Telegram клиент для workspace
 */
export async function getClient(
  workspaceId: string,
): Promise<TelegramClient | null> {
  // Проверяем кэш
  const cached = clientCache.get(workspaceId);
  if (cached) {
    return cached;
  }

  // Получаем credentials из базы
  const credentials = await getIntegrationCredentials("telegram", workspaceId);
  if (!credentials) {
    console.error(
      `❌ Telegram интеграция не найдена для workspace ${workspaceId}`,
    );
    return null;
  }

  const { apiId, apiHash, sessionData } = credentials;
  if (!apiId || !apiHash) {
    console.error("❌ Отсутствуют apiId или apiHash в credentials");
    return null;
  }

  try {
    // Создаем storage и импортируем сессию если есть
    const storage = new ExportableStorage();
    if (sessionData) {
      await storage.import(JSON.parse(sessionData));
    }

    // Создаем клиент
    const client = new TelegramClient({
      apiId: Number.parseInt(apiId, 10),
      apiHash,
      storage,
    });

    // Сохраняем в кэш
    clientCache.set(workspaceId, client);

    console.log(`✅ Telegram клиент создан для workspace ${workspaceId}`);
    return client;
  } catch (error) {
    console.error(
      `❌ Ошибка создания клиента для workspace ${workspaceId}:`,
      error,
    );
    return null;
  }
}

/**
 * Удалить клиент из кэша (например, при logout)
 */
export async function removeClient(workspaceId: string): Promise<void> {
  const client = clientCache.get(workspaceId);
  if (client) {
    // TODO: найти правильный метод для остановки клиента mtcute
    // try {
    //   await client.close();
    // } catch (error) {
    //   console.error(
    //     `Ошибка остановки клиента для workspace ${workspaceId}:`,
    //     error,
    //   );
    // }
    clientCache.delete(workspaceId);
    console.log(`🗑️ Клиент удален из кэша для workspace ${workspaceId}`);
  }
}

/**
 * Очистить весь кэш клиентов
 */
export async function clearClientCache(): Promise<void> {
  // TODO: найти правильный метод для остановки клиента mtcute
  // const promises: Promise<void>[] = [];

  for (const [workspaceId] of clientCache.entries()) {
    console.log(`🗑️ Удаление клиента для workspace ${workspaceId}`);
    clientCache.delete(workspaceId);
  }

  console.log("🗑️ Кэш клиентов очищен");
}

export { ExportableStorage } from "./storage";
export * from "./user-client";
