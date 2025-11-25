import type { Page } from "puppeteer";
import { stripHtml } from "string-strip-html";
import type { ResumeExperience } from "../types";
import { HH_CONFIG } from "./config";

export async function parseResumeExperience(
  page: Page,
  url: string
): Promise<ResumeExperience> {
  console.log(`📄 Переход на страницу резюме: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  let experience = "";
  let contacts = null;

  try {
    await page.waitForSelector('div[data-qa="resume-experience-block"]', {
      timeout: HH_CONFIG.timeouts.selector,
    });

    const htmlContent = await page.$eval(
      'div[data-qa="resume-experience-block"]',
      (el: HTMLElement) => el.innerHTML
    );

    const { result } = stripHtml(htmlContent);
    experience = result.trim();
  } catch (_e) {
    console.log("⚠️ Не удалось получить опыт работы из резюме.");
  }

  const resumeIdMatch = url.match(/\/resume\/([a-f0-9]+)/);
  if (resumeIdMatch?.[1]) {
    const resumeId = resumeIdMatch[1];
    const contactsUrl = `${HH_CONFIG.urls.baseUrl}/resume/contacts/${resumeId}?simHash=&goal=Contacts_Phone`;

    try {
      console.log(`📞 Получение контактов: ${contactsUrl}`);

      contacts = await page.evaluate(async (url: string) => {
        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });
        return await response.json();
      }, contactsUrl);

      console.log("✅ Контакты получены");
    } catch (e) {
      console.log("⚠️ Не удалось получить контакты.");
      console.error(e);
    }
  } else {
    console.log("⚠️ Не удалось извлечь ID резюме из URL.");
  }

  return { experience, contacts };
}
