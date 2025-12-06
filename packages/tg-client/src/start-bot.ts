import { botManager } from "./bot-manager";
import { createHealthServer } from "./health-server";

let isShuttingDown = false;

// Graceful shutdown handler
async function shutdown(signal: string) {
  if (isShuttingDown) {
    console.log("⚠️ Shutdown уже в процессе...");
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 Получен сигнал ${signal}, останавливаем ботов...`);

  try {
    await botManager.stopAll();
    console.log("✅ Все боты остановлены");
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка при остановке:", error);
    process.exit(1);
  }
}

// Запускаем healthcheck сервер для Kubernetes
const healthPort = Number.parseInt(process.env.HEALTH_PORT || "8002", 10);
const healthServer = createHealthServer(healthPort);

Bun.serve({
  fetch: healthServer.fetch,
  port: healthServer.port,
});

console.log(`🏥 Health server запущен на порту ${healthPort}`);

// Запускаем всех ботов из БД
botManager
  .startAll()
  .then(() => {
    const count = botManager.getBotsCount();
    console.log(`✅ Telegram боты успешно запущены: ${count} шт.`);

    // Показываем информацию о ботах
    const botsInfo = botManager.getBotsInfo();
    for (const bot of botsInfo) {
      console.log(
        `  📱 Workspace: ${bot.workspaceId}, User: @${bot.username || bot.userId}`,
      );
    }

    // Обработка graceful shutdown для Kubernetes
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // Обработка необработанных ошибок
    process.on("unhandledRejection", (reason, promise) => {
      console.error(
        "❌ Необработанное отклонение промиса:",
        promise,
        "причина:",
        reason,
      );
    });

    process.on("uncaughtException", (error) => {
      console.error("❌ Необработанное исключение:", error);
      shutdown("UNCAUGHT_EXCEPTION");
    });
  })
  .catch((error) => {
    console.error("❌ Ошибка запуска ботов:", error);
    process.exit(1);
  });
