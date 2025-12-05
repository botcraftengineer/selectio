import { TelegramClient } from "@mtcute/bun";
import { Dispatcher } from "@mtcute/dispatcher";
import { env } from "@selectio/config";
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
 * Known Telegram auth error types that indicate session is invalid
 */
const AUTH_ERROR_TYPES = [
  "AUTH_KEY_UNREGISTERED",
  "AUTH_KEY_INVALID",
  "AUTH_KEY_PERM_EMPTY",
  "SESSION_REVOKED",
  "SESSION_EXPIRED",
  "USER_DEACTIVATED",
  "USER_DEACTIVATED_BAN",
] as const;

type AuthErrorType = (typeof AUTH_ERROR_TYPES)[number];

/**
 * Check if an error is a Telegram auth error
 */
function isAuthError(error: unknown): {
  isAuth: boolean;
  errorType?: AuthErrorType;
  errorMessage?: string;
} {
  if (!error || typeof error !== "object") {
    return { isAuth: false };
  }

  let errorText = "";

  // Check for text property (MTCute error format)
  if ("text" in error) {
    errorText = String(error.text);
  }
  // Check for message property (standard Error)
  else if ("message" in error) {
    errorText = String(error.message);
  }
  // Check for name property
  else if ("name" in error) {
    errorText = String(error.name);
  }

  for (const authError of AUTH_ERROR_TYPES) {
    if (errorText.includes(authError)) {
      return {
        isAuth: true,
        errorType: authError,
        errorMessage: errorText,
      };
    }
  }

  return { isAuth: false };
}

/**
 * Send Inngest event to notify workspace admins about auth error
 */
async function sendAuthErrorEvent(
  sessionId: string,
  workspaceId: string,
  errorType: string,
  errorMessage: string,
  phone: string,
): Promise<void> {
  try {
    const eventKey = env.INNGEST_EVENT_KEY;
    const baseUrl = env.INNGEST_EVENT_API_BASE_URL;

    if (!eventKey) {
      console.warn("⚠️ INNGEST_EVENT_KEY not set, cannot send auth error event");
      return;
    }

    const response = await fetch(`${baseUrl}/e/${eventKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "telegram/auth.error",
        data: {
          sessionId,
          workspaceId,
          errorType,
          errorMessage,
          phone,
        },
      }),
    });

    if (!response.ok) {
      console.error(
        `❌ Failed to send auth error event: ${response.status} ${response.statusText}`,
      );
    } else {
      console.log(`📧 Auth error event sent for workspace ${workspaceId}`);
    }
  } catch (error) {
    console.error("❌ Error sending auth error event:", error);
  }
}

/**
 * Mark session as invalid in the database
 */
async function markSessionAsInvalid(
  sessionId: string,
  errorType: string,
  _errorMessage: string,
): Promise<void> {
  await db
    .update(telegramSession)
    .set({
      isActive: false,
      authError: errorType,
      authErrorAt: new Date(),
    })
    .where(eq(telegramSession.id, sessionId));

  console.log(`📛 Session ${sessionId} marked as invalid: ${errorType}`);
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
      .where(eq(telegramSession.isActive, true));

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
   * Handle auth error - mark session as invalid and notify admins
   */
  private async handleAuthError(
    sessionId: string,
    workspaceId: string,
    phone: string,
    errorType: string,
    errorMessage: string,
  ): Promise<void> {
    console.log(
      `🔐 Auth error detected for workspace ${workspaceId}: ${errorType}`,
    );

    // Remove bot from active bots
    this.bots.delete(workspaceId);

    // Mark session as invalid in DB
    await markSessionAsInvalid(sessionId, errorType, errorMessage);

    // Send notification event
    await sendAuthErrorEvent(
      sessionId,
      workspaceId,
      errorType,
      errorMessage,
      phone,
    );
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
        // Проверяем, является ли это ошибкой авторизации
        const authCheck = isAuthError(error);
        if (authCheck.isAuth) {
          await this.handleAuthError(
            sessionId,
            workspaceId,
            phone,
            authCheck.errorType || "AUTH_ERROR",
            authCheck.errorMessage || "Неизвестная ошибка аутентификации",
          );
          throw new Error(
            `Сессия не авторизована для workspace ${workspaceId}: ${authCheck.errorType}. Требуется повторная авторизация.`,
          );
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
          // Check if this is an auth error during message handling
          const authCheck = isAuthError(error);
          if (authCheck.isAuth) {
            await this.handleAuthError(
              sessionId,
              workspaceId,
              phone,
              authCheck.errorType || "AUTH_ERROR",
              authCheck.errorMessage || "Неизвестная ошибка аутентификации",
            );
            return;
          }
          console.error(`❌ [${workspaceId}] Ошибка обработки:`, error);
        }
      });

      // Добавляем обработчик ошибок
      dp.onError(async (err, upd) => {
        // Check if this is an auth error
        const authCheck = isAuthError(err);
        if (authCheck.isAuth) {
          await this.handleAuthError(
            sessionId,
            workspaceId,
            phone,
            authCheck.errorType || "AUTH_ERROR",
            authCheck.errorMessage || "Неизвестная ошибка аутентификации",
          );
          return true; // Stop processing
        }

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
      // MTCute автоматически управляет соединением
      console.log(`✅ Бот остановлен для workspace ${workspaceId}`);
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
      // MTCute автоматически управляет соединением
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
