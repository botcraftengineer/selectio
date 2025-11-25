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
        const name = nameEl ? nameEl.textContent.trim() : "";

        return {
          name,
          url: url ? new URL(url, "https://hh.ru").href : "",
        };
      });
    }
  );

  console.log(`✅ Найдено откликов: ${responses.length}`);
  console.log(JSON.stringify(responses, null, 2));

  const firstResponse = responses[0];
  if (firstResponse?.url) {
    const experienceData = await parseResumeExperience(page, firstResponse.url);
    console.log("\n📊 Данные первого кандидата (опыт работы и контакты):");
    console.log(JSON.stringify(experienceData, null, 2));

    await saveResponseToDb({
      vacancyId,
      resumeUrl: firstResponse.url,
      candidateName: firstResponse.name,
      experience: experienceData.experience,
      contacts: experienceData.contacts,
    });
  }

  return responses;
}
