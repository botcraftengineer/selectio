import type { Page } from "puppeteer";
import { stripHtml } from "string-strip-html";
import {
  hasVacancyDescription,
  saveBasicVacancy,
  updateVacancyDescription,
} from "../../services/vacancy-service";
import type { VacancyData } from "../types";
import { HH_CONFIG } from "./config";
import { humanBrowse, humanDelay, randomDelay } from "./human-behavior";

export async function parseVacancies(page: Page): Promise<VacancyData[]> {
  console.log(`🚀 Начинаем парсинг вакансий`);

  // ЭТАП 1: Собираем список всех активных вакансий
  console.log("\n📋 ЭТАП 1: Сбор списка активных вакансий...");
  const vacancies = await collectVacancies(page);

  if (vacancies.length === 0) {
    console.log("⚠️ Не найдено активных вакансий");
    return [];
  }

  console.log(`✅ Найдено активных вакансий: ${vacancies.length}`);

  // ЭТАП 2: Сохраняем базовую информацию всех вакансий
  console.log("\n💾 ЭТАП 2: Сохранение базовой информации...");
  await saveBasicVacancies(vacancies);

  // ЭТАП 3: Парсим описания для вакансий без описания
  console.log("\n📊 ЭТАП 3: Парсинг описаний вакансий...");
  await parseVacancyDescriptions(page, vacancies);

  console.log(`\n🎉 Парсинг вакансий завершен!`);

  return vacancies;
}

/**
 * ЭТАП 1: Собирает список всех активных вакансий
 */
async function collectVacancies(page: Page): Promise<VacancyData[]> {
  console.log(`📄 Переход на страницу вакансий: ${HH_CONFIG.urls.vacancies}`);

  await page.goto(HH_CONFIG.urls.vacancies, { waitUntil: "networkidle2" });

  // Пауза после загрузки страницы
  await humanDelay(1500, 3000);

  await page.waitForSelector('div[data-qa="vacancies-dashboard-vacancy"]', {
    timeout: HH_CONFIG.timeouts.selector,
  });

  // Имитируем просмотр списка вакансий
  await humanBrowse(page);

  const vacancies = await page.$$eval(
    'div[data-qa="vacancies-dashboard-vacancy"]',
    (elements: Element[]) => {
      return elements.map((el) => {
        const getText = (selector: string) => {
          const node = el.querySelector(selector);
          return node ? node.textContent?.trim() || "" : "";
        };

        const getAttr = (selector: string, attr: string) => {
          const node = el.querySelector(selector);
          return node ? node.getAttribute(attr) : "";
        };

        const cleanNumber = (text: string) => text.replace(/\D/g, "");

        return {
          id: el.getAttribute("data-vacancy-id") || "",
          title: getText('[data-qa="vacancies-dashboard-vacancy-name"]'),
          url: getAttr('[data-qa="vacancies-dashboard-vacancy-name"]', "href"),
          views: cleanNumber(
            getText(
              '[data-analytics-button-name="employer_vacancies_counter_views"]'
            )
          ),
          responses: getText(
            '[data-qa="vacancies-dashboard-vacancy-responses-count-total"]'
          ),
          responsesUrl: getAttr(
            '[data-qa="vacancies-dashboard-vacancy-responses-count-link"]',
            "href"
          ),
          newResponses: getText(
            '[data-qa="vacancies-dashboard-vacancy-responses-count-new"]'
          ),
          resumesInProgress: cleanNumber(
            getText(
              '[data-qa="vacancies-dashboard-vacancy-resumes-in-progress-count"]'
            )
          ),
          suitableResumes: cleanNumber(
            getText('[data-qa="suitable-resumes-count"]')
          ),
          region: getText('[data-qa="table-flexible-cell-area"]'),
          description: "",
        };
      });
    }
  );

  // Нормализуем URL вакансий
  for (const vacancy of vacancies) {
    if (vacancy.url) {
      vacancy.url = vacancy.url.startsWith("http")
        ? vacancy.url
        : new URL(vacancy.url, HH_CONFIG.urls.baseUrl).href;
    } else if (vacancy.id) {
      vacancy.url = `${HH_CONFIG.urls.baseUrl}/vacancy/${vacancy.id}`;
    }
  }

  return vacancies;
}

/**
 * ЭТАП 2: Сохраняет базовую информацию всех вакансий
 */
async function saveBasicVacancies(vacancies: VacancyData[]): Promise<void> {
  let savedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < vacancies.length; i++) {
    const vacancy = vacancies[i];
    if (!vacancy) continue;

    try {
      await saveBasicVacancy(vacancy);
      savedCount++;
    } catch (error) {
      errorCount++;
      console.error(`❌ Ошибка сохранения вакансии ${vacancy.title}:`, error);
      // Продолжаем работу со следующей вакансией
    }
  }

  console.log(
    `✅ Базовая информация: успешно ${savedCount}, ошибок ${errorCount}`
  );
}

/**
 * ЭТАП 3: Парсит описания для вакансий без описания
 */
async function parseVacancyDescriptions(
  page: Page,
  vacancies: VacancyData[]
): Promise<void> {
  let parsedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < vacancies.length; i++) {
    const vacancy = vacancies[i];
    if (!vacancy || !vacancy.url) continue;

    try {
      // Проверяем, есть ли уже описание
      const hasDescription = await hasVacancyDescription(vacancy.id);

      if (hasDescription) {
        skippedCount++;
        console.log(
          `⏭️ Пропуск ${i + 1}/${vacancies.length}: ${vacancy.title} (описание есть)`
        );
        continue;
      }

      console.log(
        `\n📊 Парсинг описания ${i + 1}/${vacancies.length}: ${vacancy.title}`
      );

      // Задержка между просмотром вакансий
      if (parsedCount > 0) {
        const delay = randomDelay(2000, 5000);
        console.log(
          `⏳ Пауза ${Math.round(delay / 1000)}с перед следующей вакансией...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const description = await parseVacancyDetails(page, vacancy.url);

      if (description) {
        await updateVacancyDescription(vacancy.id, description);
        vacancy.description = description;
        parsedCount++;
        console.log(
          `✅ Описание ${i + 1}/${vacancies.length} обработано успешно`
        );
      } else {
        console.log(`⚠️ Пустое описание для ${vacancy.title}`);
      }
    } catch (error) {
      errorCount++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `❌ Ошибка парсинга описания ${vacancy.title}:`,
        errorMessage
      );

      // Пауза после ошибки перед следующей попыткой
      console.log(`⏭️ Переход к следующей вакансии...`);
      await humanDelay(2000, 4000);
    }
  }

  console.log(
    `✅ Итого описания: успешно ${parsedCount}, пропущено ${skippedCount}, ошибок ${errorCount}`
  );
}

/**
 * Парсит детальную страницу вакансии и извлекает описание
 */
async function parseVacancyDetails(page: Page, url: string): Promise<string> {
  console.log(`📄 Переход на детальную страницу: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  // Пауза после загрузки
  await humanDelay(1000, 2500);

  try {
    await page.waitForSelector(".vacancy-section", {
      timeout: HH_CONFIG.timeouts.selector,
    });

    // Имитируем чтение описания вакансии
    await humanBrowse(page);

    const htmlContent = await page.$eval(
      ".vacancy-section",
      (el) => (el as HTMLElement).innerHTML
    );

    const { result } = stripHtml(htmlContent as string);
    return result.trim();
  } catch (_e) {
    console.log("⚠️ Не удалось получить описание вакансии.");
    return "";
  }
}
