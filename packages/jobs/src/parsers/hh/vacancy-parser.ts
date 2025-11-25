import type { Page } from "puppeteer";
import { stripHtml } from "string-strip-html";
import { saveVacancyToDb } from "../../services/vacancy-service";
import type { VacancyData } from "../types";
import { HH_CONFIG } from "./config";
import { humanBrowse, humanDelay, randomDelay } from "./human-behavior";

export async function parseVacancies(page: Page): Promise<VacancyData[]> {
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
    (elements: Array<Element>) => {
      return elements.map((el) => {
        const getText = (selector: string) => {
          const node = el.querySelector(selector);
          return node ? node.textContent.trim() : "";
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

  console.log(`✅ Найдено активных вакансий: ${vacancies.length}`);

  for (let i = 0; i < vacancies.length; i++) {
    const vacancy = vacancies[i];
    if (!vacancy) continue;

    let vacancyUrl = vacancy.url;

    if (!vacancyUrl && vacancy.id) {
      vacancyUrl = `${HH_CONFIG.urls.baseUrl}/vacancy/${vacancy.id}`;
    }

    if (vacancyUrl) {
      const fullUrl = vacancyUrl.startsWith("http")
        ? vacancyUrl
        : new URL(vacancyUrl, HH_CONFIG.urls.baseUrl).href;

      // Задержка между просмотром вакансий
      if (i > 0) {
        const delay = randomDelay(2000, 5000);
        console.log(
          `⏳ Пауза ${Math.round(delay / 1000)}с перед следующей вакансией...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const description = await parseVacancyDetails(page, fullUrl);
      vacancy.description = description;
      vacancy.url = fullUrl;
    }

    await saveVacancyToDb(vacancy);
  }

  console.log(JSON.stringify(vacancies, null, 2));
  return vacancies;
}

async function parseVacancyDetails(page: Page, url: string): Promise<string> {
  console.log(`📄 Переход на детальную страницу вакансии: ${url}`);
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
      (el) => el.innerHTML
    );

    const { result } = stripHtml(htmlContent);
    return result.trim();
  } catch (_e) {
    console.log("⚠️ Не удалось получить описание вакансии.");
    return "";
  }
}
