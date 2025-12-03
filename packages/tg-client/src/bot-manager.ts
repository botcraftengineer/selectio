import { TelegramClient } from "@mtcute/bun";
import { Dispatcher } from "@mtcute/dispatcher";
import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import { telegramSession } from "@selectio/db/schema";
import { createBotHandler } from "./bot-handler";
import { ExportableStorage } from "./storage";

interface BotInstance {
  client: TelegramClient;
  workspaceId: string;
  sessionId: string;
  userId: string;
  username?: string;
  phone: string;
}

/**
 * Менеджер для управления несколькими ботами
 */
class BotManager {
  private bots: Map<string, BotInstance> = new Map();
  private isRunning = false;

  /**
   * Запустить всех ботов из БД
   */
  async startAll(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Боты уже запущены");
      return;
    }

    console.log("🚀 Запуск всех Telegram ботов...");

    // Получаем все активные Telegram сессии
    const sessions = await db
      .select()
      .from(telegramSession)
      .where(eq(telegramSession.isActive, "true"));

    if (sessions.length === 0) {
      console.log("⚠️ Нет активных Telegram сессий");
      return;
    }

    console.log(`📋 Найдено ${sessions.length} сессий`);

    // Запускаем бота для каждой сессии
    const startPromises = sessions.map((session) => this.startBot(session));

    const results = await Promise.allSettled(startPromises);

    // Подсчитываем результаты
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`✅ Успешно запущено: ${successful}`);
    if (failed > 0) {
      console.log(`❌ Ошибок: ${failed}`);
    }

    this.isRunning = true;
  }

  /**
   * Запустить одного бота
   */
  private async startBot(
    session: typeof telegramSession.$inferSelect,
  ): Promise<void> {
    const {
      id: sessionId,
      workspaceId,
      apiId,
      apiHash,
      sessionData,
      phone,
    } = session;

    try {
      if (!apiId || !apiHash) {
        throw new Error(
          `Отсутствуют apiId или apiHash для workspace ${workspaceId}`,
        );
      }

      // Создаем storage и импортируем сессию
      const storage = new ExportableStorage();
      if (sessionData) {
        await storage.import(sessionData as Record<string, string>);
      }

      // Создаем клиент с настройками для получения обновлений
      const client = new TelegramClient({
        apiId: Number.parseInt(apiId, 10),
        apiHash,
        storage,
        updates: {
          catchUp: true, // Получать пропущенные обновления
          messageGroupingInterval: 250, // Группировать альбомы (250ms)
        },
        logLevel: 1,
      });

      console.log(`🔌 Подключение клиента для workspace ${workspaceId}...`);

      // Проверяем авторизацию
      let user: Awaited<ReturnType<typeof client.getMe>> | null = null;
      try {
        user = await client.getMe();
      } catch (error) {
        // Проверяем, является ли это ошибкой неавторизованности
        if (error && typeof error === "object" && "text" in error) {
          const errorText = String(error.text);
          if (errorText.includes("AUTH_KEY_UNREGISTERED")) {
            throw new Error(
              `Сессия не авторизована для workspace ${workspaceId}. Требуется повторная авторизация.`,
            );
          }
        }
        // Другая ошибка - пробрасываем дальше
        throw error;
      }

      if (!user) {
        throw new Error(
          `Не удалось получить информацию о пользователе для workspace ${workspaceId}`,
        );
      }

      // Завершаем все другие сессии, чтобы получать обновления
      console.log(
        `🔄 Завершение других сессий для workspace ${workspaceId}...`,
      );
      try {
        await client.call({
          _: "auth.resetAuthorizations",
        });
        console.log(`✅ Другие сессии завершены для workspace ${workspaceId}`);
      } catch (error) {
        console.warn(
          `⚠️ Не удалось завершить другие сессии для workspace ${workspaceId}:`,
          error,
        );
        // Продолжаем работу, даже если не удалось завершить сессии
      }

      // Создаем dispatcher
      const dp = Dispatcher.for(client);

      // Создаем обработчик один раз
      const messageHandler = createBotHandler(client);

      // Регистрируем обработчик через dispatcher
      dp.onNewMessage(async (msg) => {
        try {
          await messageHandler(msg);
        } catch (error) {
          console.error(`❌ [${workspaceId}] Ошибка обработки:`, error);
        }
      });

      // Добавляем обработчик ошибок
      dp.onError((err, upd) => {
        console.error(`❌ [${workspaceId}] Ошибка в dispatcher:`, err);
        console.error(`Обновление:`, upd.name);
        return false; // Не останавливать обработку
      });

      console.log(`✅ Dispatcher зарегистрирован для workspace ${workspaceId}`);

      // Сохраняем экземпляр бота
      const botInstance: BotInstance = {
        client,
        workspaceId,
        sessionId,
        userId: user.id.toString(),
        username: user.username || undefined,
        phone,
      };

      this.bots.set(workspaceId, botInstance);
      // Подключаемся
      await client.start();
      console.log(
        `✅ Бот запущен для workspace ${workspaceId}: ${user.firstName || ""} ${user.lastName || ""} (@${user.username || "no username"}) [${phone}]`,
      );
    } catch (error) {
      console.error(
        `❌ Ошибка запуска бота для workspace ${workspaceId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Остановить всех ботов
   */
  async stopAll(): Promise<void> {
    console.log("🛑 Остановка всех ботов...");

    for (const [workspaceId] of this.bots.entries()) {
      try {
        // MTCute автоматически управляет соединением
        console.log(`✅ Бот остановлен для workspace ${workspaceId}`);
      } catch (error) {
        console.error(
          `❌ Ошибка остановки бота для workspace ${workspaceId}:`,
          error,
        );
      }
    }

    this.bots.clear();
    this.isRunning = false;
    console.log("✅ Все боты остановлены");
  }

  /**
   * Перезапустить бота для конкретного workspace
   */
  async restartBot(workspaceId: string): Promise<void> {
    console.log(`🔄 Перезапуск бота для workspace ${workspaceId}...`);

    // Останавливаем существующего бота
    const existing = this.bots.get(workspaceId);
    if (existing) {
      this.bots.delete(workspaceId);
    }

    // Получаем сессию из БД
    const [session] = await db
      .select()
      .from(telegramSession)
      .where(eq(telegramSession.workspaceId, workspaceId))
      .limit(1);

    if (!session) {
      throw new Error(
        `Telegram сессия не найдена для workspace ${workspaceId}`,
      );
    }

    // Запускаем нового бота
    await this.startBot(session);
  }

  /**
   * Получить информацию о запущенных ботах
   */
  getBotsInfo(): Array<{
    workspaceId: string;
    sessionId: string;
    userId: string;
    username?: string;
    phone: string;
  }> {
    return Array.from(this.bots.values()).map((bot) => ({
      workspaceId: bot.workspaceId,
      sessionId: bot.sessionId,
      userId: bot.userId,
      username: bot.username,
      phone: bot.phone,
    }));
  }

  /**
   * Получить клиента для workspace
   */
  getClient(workspaceId: string): TelegramClient | null {
    return this.bots.get(workspaceId)?.client || null;
  }

  /**
   * Проверить, запущен ли бот для workspace
   */
  isRunningForWorkspace(workspaceId: string): boolean {
    return this.bots.has(workspaceId);
  }

  /**
   * Получить количество запущенных ботов
   */
  getBotsCount(): number {
    return this.bots.size;
  }
}

// Singleton instance
export const botManager = new BotManager();
