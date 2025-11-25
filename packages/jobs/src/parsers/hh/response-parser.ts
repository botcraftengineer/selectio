import type { Page } from "puppeteer";
import {
  hasDetailedInfo,
  saveBasicResponse,
  updateResponseDetails,
} from "../../services/response-service";
import type { ResponseData } from "../types";
import { HH_CONFIG } from "./config";
import { humanDelay, humanScroll, randomDelay } from "./human-behavior";
import { parseResumeExperience } from "./resume-parser";

interface ResponseWithId extends ResponseData {
  resumeId: string;
}

export async function parseResponses(
  page: Page,
  url: string,
  vacancyId: string
): Promise<ResponseData[]> {
  // Извлекаем vacancyId из URL если он там есть
  const urlObj = new URL(url, HH_CONFIG.urls.baseUrl);
  const urlVacancyId = urlObj.searchParams.get("vacancyId") || vacancyId;

  console.log(`🚀 Начинаем парсинг откликов для вакансии ${urlVacancyId}`);

  // ЭТАП 1: Собираем отклики со всех страниц и сразу сохраняем в базу
  console.log("\n📋 ЭТАП 1: Сбор откликов и сохранение в базу...");
  const allResponses = await collectAndSaveResponses(
    page,
    urlVacancyId,
    vacancyId
  );

  if (allResponses.length === 0) {
    console.log("⚠️ Не найдено откликов для обработки");
    return [];
  }

  console.log(`✅ Всего обработано откликов: ${allResponses.length}`);

  // ЭТАП 2: Определяем отклики без детальной информации
  console.log("\n🔍 ЭТАП 2: Поиск откликов без детальной информации...");
  const responsesNeedingDetails =
    await filterResponsesNeedingDetails(allResponses);

  console.log(
    `✅ Откликов требующих парсинга деталей: ${responsesNeedingDetails.length}`
  );

  if (responsesNeedingDetails.length === 0) {
    console.log("ℹ️ Все отклики уже имеют детальную информацию");
    return allResponses;
  }

  // ЭТАП 3: Парсим детальную информацию резюме
  console.log("\n📊 ЭТАП 3: Парсинг детальной информации резюме...");
  await parseResponseDetails(page, responsesNeedingDetails, vacancyId);

  console.log(
    `\n🎉 Парсинг завершен! Обработано откликов: ${responsesNeedingDetails.length}`
  );

  return allResponses;
}

/**
 * ЭТАП 1: Собирает отклики со всех страниц и сразу сохраняет в базу
 */
async function collectAndSaveResponses(
  page: Page,
  vacancyId: string,
  vacancyIdForSave: string
): Promise<ResponseWithId[]> {
  const allResponses: ResponseWithId[] = [];
  let currentPage = 0;
  let totalSaved = 0;
  let totalSkipped = 0;

  while (true) {
    const pageUrl =
      currentPage === 0
        ? `https://hh.ru/employer/vacancyresponses?vacancyId=${vacancyId}`
        : `https://hh.ru/employer/vacancyresponses?vacancyId=${vacancyId}&page=${currentPage}`;

    console.log(`📄 Страница ${currentPage}: ${pageUrl}`);

    try {
      await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 30000 });
    } catch (error) {
      console.error(`❌ Ошибка загрузки страницы ${currentPage}:`, error);
      break;
    }

    await humanDelay(1000, 2000);

    // Проверяем наличие контейнера с откликами
    const hasResponses = await page
      .waitForSelector('div[data-qa="vacancy-real-responses"]', {
        timeout: HH_CONFIG.timeouts.selector,
      })
      .then(() => true)
      .catch(() => false);

    if (!hasResponses) {
      console.log(
        `⚠️ Контейнер с откликами не найден на странице ${currentPage}`
      );
      break;
    }

    // Скроллим для подгрузки
    await humanScroll(page);
    await humanDelay(1000, 2000);

    // Парсим отклики на странице
    const pageResponses = await page.$$eval(
      'div[data-qa="vacancy-real-responses"] [data-resume-id]',
      (elements: Element[]) => {
        return elements.map((el) => {
          const link = el.querySelector('a[data-qa*="serp-item__title"]');
          const url = link ? link.getAttribute("href") : "";
          const nameEl = el.querySelector(
            'span[data-qa="resume-serp__resume-fullname"]'
          );
          const name = nameEl ? nameEl.textContent?.trim() : "";
          const resumeId = el.getAttribute("data-resume-id") || "";

          return {
            name,
            url: url ? new URL(url, "https://hh.ru").href : "",
            resumeId,
          };
        });
      }
    );

    if (pageResponses.length === 0) {
      console.log(`⚠️ Нет откликов на странице ${currentPage}`);
      break;
    }

    console.log(
      `✅ Страница ${currentPage}: найдено ${pageResponses.length} откликов`
    );

    // Обрабатываем и сохраняем отклики с текущей страницы
    let pageSaved = 0;
    let pageSkipped = 0;
    let pageErrors = 0;

    for (const response of pageResponses) {
      if (response.url && response.resumeId) {
        const responseWithId: ResponseWithId = {
          ...response,
          resumeId: response.resumeId,
        };

        allResponses.push(responseWithId);

        try {
          // Сразу сохраняем в базу
          const saved = await saveBasicResponse(
            vacancyIdForSave,
            response.resumeId,
            response.url,
            response.name
          );

          if (saved) {
            pageSaved++;
          } else {
            pageSkipped++;
          }
        } catch (error) {
          pageErrors++;
          console.error(
            `❌ Ошибка сохранения отклика ${response.name}:`,
            error
          );
          // Продолжаем работу со следующим откликом
        }
      } else {
        console.log(`⚠️ Не удалось получить resumeId для: ${response.name}`);
      }
    }

    totalSaved += pageSaved;
    totalSkipped += pageSkipped;

    console.log(
      `💾 Страница ${currentPage}: сохранено ${pageSaved}, пропущено ${pageSkipped}${pageErrors > 0 ? `, ошибок ${pageErrors}` : ""}`
    );

    currentPage++;
    await humanDelay(1500, 3000);
  }

  console.log(
    `\n✅ Итого: собрано ${allResponses.length}, сохранено новых ${totalSaved}, пропущено (уже в базе) ${totalSkipped}`
  );

  return allResponses;
}

/**
 * ЭТАП 2: Фильтрует отклики, которым нужна детальная информация
 */
async function filterResponsesNeedingDetails(
  responses: ResponseWithId[]
): Promise<ResponseWithId[]> {
  const responsesNeedingDetails: ResponseWithId[] = [];

  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    if (!response) continue;

    try {
      const hasDetails = await hasDetailedInfo(response.resumeId);

      if (!hasDetails) {
        responsesNeedingDetails.push(response);
        console.log(
          `📝 Требуется парсинг ${i + 1}/${responses.length}: ${response.name}`
        );
      } else {
        console.log(
          `✅ Детали есть ${i + 1}/${responses.length}: ${response.name}`
        );
      }
    } catch (error) {
      console.error(`❌ Ошибка проверки деталей для ${response.name}:`, error);
      // В случае ошибки проверки, добавляем в список для парсинга
      responsesNeedingDetails.push(response);
    }
  }

  return responsesNeedingDetails;
}

/**
 * ЭТАП 3: Парсит детальную информацию резюме и обновляет записи
 */
async function parseResponseDetails(
  page: Page,
  responses: ResponseWithId[],
  vacancyId: string
): Promise<void> {
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    if (!response) continue;

    try {
      console.log(
        `\n📊 Парсинг резюме ${i + 1}/${responses.length}: ${response.name}`
      );

      // Случайная задержка между просмотром резюме (имитация человека)
      if (i > 0) {
        const delay = randomDelay(3000, 8000);
        console.log(
          `⏳ Пауза ${Math.round(delay / 1000)}с перед следующим резюме...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Парсим детальную информацию резюме
      const experienceData = await parseResumeExperience(page, response.url);

      // Обновляем детальную информацию в базе
      await updateResponseDetails({
        vacancyId,
        resumeId: response.resumeId,
        resumeUrl: response.url,
        candidateName: response.name,
        experience: experienceData.experience,
        contacts: experienceData.contacts,
        languages: experienceData.languages,
        about: experienceData.about,
        education: experienceData.education,
        courses: experienceData.courses,
      });

      successCount++;
      console.log(`✅ Резюме ${i + 1}/${responses.length} обработано успешно`);
    } catch (error) {
      errorCount++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `❌ Ошибка парсинга резюме ${response.name}:`,
        errorMessage
      );

      // Пауза после ошибки перед следующей попыткой
      console.log(`⏭️ Переход к следующему резюме...`);
      await humanDelay(3000, 5000);
    }
  }

  console.log(
    `\n📊 Итого парсинг резюме: успешно ${successCount}, ошибок ${errorCount}`
  );
}
