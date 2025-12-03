import { randomUUID } from "node:crypto";
import { db, eq } from "@selectio/db";
import { integration } from "@selectio/db/schema";
import axios from "axios";

/**
 * Извлекает chatId из resume_url
 * Пример: https://hh.ru/resume/66b4c21d000e7fb565004a23a1387263686e79?vacancyId=127379451&t=4927104694&resumeId=243250533
 * Возвращает: 4927104694
 */
export function extractChatIdFromResumeUrl(resumeUrl: string): string | null {
  try {
    const url = new URL(resumeUrl);
    const chatId = url.searchParams.get("t");
    return chatId;
  } catch (error) {
    console.error("Ошибка парсинга resume_url:", error);
    return null;
  }
}

/**
 * Отправляет сообщение в чат hh.ru
 */
export async function sendHHChatMessage(params: {
  workspaceId: string;
  chatId: string;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  const { workspaceId, chatId, text } = params;

  try {
    // Получаем интеграцию hh.ru для workspace
    const hhIntegration = await db.query.integration.findFirst({
      where: (fields, { and }) =>
        and(
          eq(fields.workspaceId, workspaceId),
          eq(fields.type, "hh"),
          eq(fields.isActive, "true"),
        ),
    });

    if (!hhIntegration) {
      return {
        success: false,
        error: "Интеграция hh.ru не найдена или неактивна",
      };
    }

    if (!hhIntegration.cookies || hhIntegration.cookies.length === 0) {
      return {
        success: false,
        error: "Cookies для hh.ru не найдены",
      };
    }

    // Формируем Cookie header
    const cookieHeader = hhIntegration.cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    // Генерируем уникальный idempotencyKey
    const idempotencyKey = randomUUID();

    // Отправляем запрос в hh.ru API с полными браузерными заголовками
    console.log({
      chatId,
      idempotencyKey,
      text,
    });
    const response = await axios.post(
      "https://chatik.hh.ru/chatik/api/send",
      {
        chatId: Number(chatId),
        idempotencyKey,
        text,
      },
      {
        params: {
          hhtmSourceLabel: "spoiler",
          hhtmSource: "chat",
        },
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
          "Content-Type": "application/json",
          Cookie: cookieHeader,
          Origin: "https://hh.ru",
          Referer: "https://hh.ru/",
          "Sec-Ch-Ua":
            '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        validateStatus: (status: number) => status < 500,
      },
    );

    if (response.status !== 200) {
      console.error("Ошибка отправки в hh.ru:", response.status, response.data);
      return {
        success: false,
        error: `HTTP ${response.status}: ${JSON.stringify(response.data)}`,
      };
    }

    // Обновляем lastUsedAt для интеграции
    await db
      .update(integration)
      .set({ lastUsedAt: new Date() })
      .where(eq(integration.id, hhIntegration.id));

    console.log(`✅ Сообщение отправлено в hh.ru чат ${chatId}`);

    return { success: true };
  } catch (error) {
    console.error("Ошибка отправки сообщения в hh.ru:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
