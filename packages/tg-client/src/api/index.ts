import app from "./server";

const port = Number.parseInt(process.env.TG_CLIENT_PORT || "8001", 10);

console.log(`🚀 Запуск Telegram Client API на порту ${port}`);

export default {
  fetch: app.fetch,
  port,
};

console.log(`✅ Telegram Client API запущен на http://localhost:${port}`);
