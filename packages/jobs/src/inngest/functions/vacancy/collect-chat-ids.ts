import { db, eq } from "@selectio/db";
import { integration, vacancy, vacancyResponse } from "@selectio/db/schema";
import axios from "axios";
import { inngest } from "../../client";

interface ChatItem {
  id: string;
  resources: {
    RESUME: string[];
    NEGOTIATION_TOPIC: string[];
    VACANCY: string[];
  };
}

interface ChatsResponse {
  chats: {
    items: ChatItem[];
    page: number;
    perPage: number;
    pages: number;
    found: number;
    hasNextPage: boolean;
  };
}

/**
 * Извлекает resumeId из resume_url
 * Пример: https://hh.ru/resume/7021c5d7000fa7472d004a23a134657a4a5063?vacancyId=127379451&t=4919624854&resumeId=262620973
 * Возвращает: 262620973
 */
function extractResumeIdFromUrl(resumeUrl: string): string | null {
  try {
    const url = new URL(resumeUrl);
    const resumeId = url.searchParams.get("resumeId");
    return resumeId;
  } catch (error) {
    console.error("Ошибка парсинга resume_url:", error);
    return null;
  }
}

/**
 * Inngest функция для сбора chat_id для всех откликов вакансии
 */
export const collectChatIdsFunction = inngest.createFunction(
  {
    id: "collect-chat-ids",
    name: "Collect Chat IDs for Vacancy Responses",
    retries: 2,
  },
  { event: "vacancy/chat-ids.collect" },
  async ({ event, step }) => {
    const { vacancyId } = event.data;

    return await step.run("collect-chat-ids", async () => {
      console.log(`🚀 Начинаем сбор chat_id для вакансии ${vacancyId}`);

      // Получаем вакансию
      const vacancyData = await db.query.vacancy.findFirst({
        where: eq(vacancy.id, vacancyId),
      });

      if (!vacancyData) {
        throw new Error(`Вакансия ${vacancyId} не найдена`);
      }

      // Получаем интеграцию HH
      const hhIntegration = await db.query.integration.findFirst({
        where: (fields, { and }) =>
          and(
            eq(fields.workspaceId, vacancyData.workspaceId),
            eq(fields.type, "hh"),
            eq(fields.isActive, true),
          ),
      });

      if (!hhIntegration) {
        throw new Error("Интеграция HH не найдена или неактивна");
      }

      if (!hhIntegration.cookies || hhIntegration.cookies.length === 0) {
        throw new Error("Cookies для HH не найдены");
      }

      // Формируем Cookie header
      const cookieHeader = hhIntegration.cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");

      // Собираем все чаты со всех страниц
      const allChats: ChatItem[] = [];
      let currentPage = 0;
      let hasNextPage = true;

      while (hasNextPage) {
        console.log(`📄 Запрашиваем страницу ${currentPage}...`);

        const response = await axios.get<ChatsResponse>(
          "https://chatik.hh.ru/chatik/api/chats",
          {
            params: {
              vacancyIds: vacancyId,
              filterUnread: false,
              filterHasTextMessage: true,
              do_not_track_session_events: true,
              page: currentPage,
            },
            headers: {
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
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
          },
        );

        if (!response.data?.chats?.items) {
          console.log("Чаты не найдены");
          break;
        }

        const {
          items,
          pages,
          found,
          hasNextPage: hasNext,
        } = response.data.chats;

        allChats.push(...items);
        console.log(
          `📊 Страница ${currentPage}/${pages}: получено ${items.length} чатов (всего найдено: ${found})`,
        );

        hasNextPage = hasNext;
        currentPage++;
      }

      if (allChats.length === 0) {
        console.log("Чаты не найдены");
        return { success: true, updatedCount: 0 };
      }

      console.log(`📊 Всего получено чатов: ${allChats.length}`);

      // Получаем все отклики для вакансии
      const responses = await db.query.vacancyResponse.findMany({
        where: eq(vacancyResponse.vacancyId, vacancyId),
      });

      let updatedCount = 0;

      // Обновляем chat_id для каждого отклика
      for (const resp of responses) {
        // Пытаемся извлечь resumeId из URL
        const resumeIdFromUrl = extractResumeIdFromUrl(resp.resumeUrl);

        // Ищем соответствующий чат по resumeId в resources.RESUME
        const chat = allChats.find((c) => {
          const resumeIds = c.resources?.RESUME || [];
          return resumeIds.includes(resumeIdFromUrl || "");
        });

        if (chat) {
          await db
            .update(vacancyResponse)
            .set({ chatId: chat.id })
            .where(eq(vacancyResponse.id, resp.id));

          updatedCount++;
          console.log(`✅ Обновлен chat_id для отклика ${resp.id}: ${chat.id}`);
        }
      }

      // Обновляем lastUsedAt для интеграции
      await db
        .update(integration)
        .set({ lastUsedAt: new Date() })
        .where(eq(integration.id, hhIntegration.id));

      console.log(
        `✅ Сбор chat_id завершен. Обновлено откликов: ${updatedCount}`,
      );

      return { success: true, updatedCount };
    });
  },
);
