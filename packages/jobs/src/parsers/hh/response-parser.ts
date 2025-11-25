import type { Page } from "puppeteer";
import {
  checkResponseExists,
  saveResponseToDb,
} from "../../services/response-service";
import type { ResponseData } from "../types";
import { HH_CONFIG } from "./config";
import { humanDelay, humanScroll, randomDelay } from "./human-behavior";
import { parseResumeExperience } from "./resume-parser";
import { extractResumeId } from "./utils";

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

  // ЭТАП 1: Собираем все отклики со всех страниц
  console.log("\n📋 ЭТАП 1: Сбор всех откликов...");
  const allResponses = await collectAllResponses(page, urlVacancyId);

  if (allResponses.length === 0) {
    console.log("⚠️ Не найдено откликов для обработки");
    return [];
  }

  console.log(`✅ Собрано откликов: ${allResponses.length}`);

  // ЭТАП 2: Фильтруем новые отклики
  console.log("\n🔍 ЭТАП 2: Фильтрация новых откликов...");
  const newResponses = await filterNewResponses(allResponses);

  console.log(
    `✅ Новых откликов: ${newResponses.length}, Пропущено (уже в базе): ${allResponses.length - newResponses.length}`
  );

  if (newResponses.length === 0) {
    console.log("ℹ️ Нет новых откликов для обработки");
    return [];
  }

  // ЭТАП 3: Парсим детальную информацию по каждому новому отклику
  console.log("\n📊 ЭТАП 3: Парсинг детальной информации...");
  await parseResponseDetails(page, newResponses, vacancyId);

  console.log(
    `\n🎉 Парсинг завершен! Обработано новых откликов: ${newResponses.length}`
  );

  return allResponses;
}

/**
 * ЭТАП 1: Собирает все отклики со всех страниц
 */
async function collectAllResponses(
  page: Page,
  vacancyId: string
): Promise<ResponseWithId[]> {
  const allResponses: ResponseWithId[] = [];
  let currentPage = 0;
  const hasMorePages = true;

  while (hasMorePages) {
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

          return {
            name,
            url: url ? new URL(url, "https://hh.ru").href : "",
          };
        });
      }
    );

    if (pageResponses.length === 0) {
      console.log(`⚠️ Нет откликов на странице ${currentPage}`);
      break;
    }

    // Извлекаем resumeId для каждого отклика
    for (const response of pageResponses) {
      if (response.url) {
        const resumeId = extractResumeId(response.url);
        if (resumeId) {
          allResponses.push({
            ...response,
            resumeId,
          });
        } else {
          console.log(`⚠️ Не удалось извлечь ID из URL: ${response.url}`);
        }
      }
    }

    console.log(
      `✅ Страница ${currentPage}: найдено ${pageResponses.length} откликов`
    );

    currentPage++;
    await humanDelay(1500, 3000);
  }

  return allResponses;
}

/**
 * ЭТАП 2: Фильтрует новые отклики (которых еще нет в базе)
 */
async function filterNewResponses(
  responses: ResponseWithId[]
): Promise<ResponseWithId[]> {
  const newResponses: ResponseWithId[] = [];

  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    if (!response) continue;

    const exists = await checkResponseExists(response.resumeId);

    if (!exists) {
      newResponses.push(response);
      console.log(
        `✅ Новый отклик ${i + 1}/${responses.length}: ${response.name}`
      );
    } else {
      console.log(
        `⏭️ Пропуск ${i + 1}/${responses.length}: ${response.name} (уже в базе)`
      );
    }
  }

  return newResponses;
}

/**
 * ЭТАП 3: Парсит детальную информацию по каждому новому отклику
 */
async function parseResponseDetails(
  page: Page,
  responses: ResponseWithId[],
  vacancyId: string
): Promise<void> {
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    if (!response) continue;

    try {
      console.log(
        `\n📊 Обработка ${i + 1}/${responses.length}: ${response.name}`
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

      // Сохраняем в базу
      await saveResponseToDb({
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `❌ Ошибка обработки отклика ${response.name}:`,
        errorMessage
      );

      // Пауза после ошибки
      await humanDelay(3000, 5000);
    }
  }
}
