import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../client";

async function setupUuidV7() {
  try {
    console.log("Настройка функции UUID v7...");

    const sqlContent = readFileSync(join(__dirname, "uuid-v7.sql"), "utf-8");

    await db.execute(sql.raw(sqlContent));

    console.log("✅ Функция UUID v7 успешно создана");
  } catch (error) {
    console.error("❌ Ошибка настройки UUID v7:", error);
    throw error;
  }
}

setupUuidV7()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
