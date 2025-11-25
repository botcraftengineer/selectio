import type { Page } from "puppeteer";
import { saveResponseToDb } from "../../services/response-service";
import type { ResponseData } from "../types";
import { HH_CONFIG } from "./config";
import { parseResumeExperience } from "./resume-parser";

export async function parseResponses(
  page: Page,
  url: string,
  vacancyId: string
): Promise<ResponseData[]> {
  console.log(`📄 Переход на страницу откликов: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  try {
    await page.waitForSelector("[data-resume-id]", {
      timeout: HH_CONFIG.timeouts.selector,
    });
  } catch (_e) {
    console.log("⚠️ Не найдено резюме на странице (возможно, нет откликов).");
    return [];
  }

  const responses = await page.$$eval(
    "[data-resume-id]",
    (elements: Array<Element>) => {
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

  console.log(`✅ Найдено откликов: ${responses.length}`);

  // Сохраняем все отклики
  for (const response of responses) {
    if (response?.url) {
      try {
        const experienceData = await parseResumeExperience(page, response.url);
        console.log(`\n📊 Обработка кандидата: ${response.name}`);

        await saveResponseToDb({
          vacancyId,
          resumeUrl: response.url,
          candidateName: response.name,
          experience: experienceData.experience,
          contacts: experienceData.contacts,
        });
      } catch (error) {
        console.error(`❌ Ошибка обработки отклика ${response.name}:`, error);
      }
    }
  }

  return responses;
}
