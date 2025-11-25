import type { Page } from "puppeteer";
import { stripHtml } from "string-strip-html";
import type { ResumeExperience } from "../types";
import { HH_CONFIG } from "./config";
import { humanBrowse, humanDelay, humanRead } from "./human-behavior";

export async function parseResumeExperience(
  page: Page,
  url: string
): Promise<ResumeExperience> {
  console.log(`📄 Переход на страницу резюме: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  // Имитируем чтение резюме
  await humanRead(page);

  let experience = "";
  let languages = "";
  let about = "";
  let education = "";
  let courses = "";
  let contacts = null;

  // Парсинг опыта работы
  try {
    await page.waitForSelector('div[data-qa="resume-experience-block"]', {
      timeout: HH_CONFIG.timeouts.selector,
    });

    // Небольшая задержка перед чтением
    await humanDelay(500, 1500);

    const htmlContent = await page.$eval(
      'div[data-qa="resume-experience-block"]',
      (el: HTMLElement) => el.innerHTML
    );

    const { result } = stripHtml(htmlContent);
    experience = result.trim();
  } catch (_e) {
    console.log("⚠️ Не удалось получить опыт работы из резюме.");
  }

  // Парсинг языков
  try {
    await humanDelay(300, 800);

    const htmlContent = await page.$eval(
      'div[data-qa="resume-languages-block"]',
      (el: HTMLElement) => el.innerHTML
    );

    const { result } = stripHtml(htmlContent);
    languages = result.trim();
  } catch (_e) {
    console.log("⚠️ Не удалось получить языки из резюме.");
  }

  // Парсинг информации о себе
  try {
    await humanDelay(300, 800);

    const htmlContent = await page.$eval(
      'div[data-qa="resume-about-block"]',
      (el: HTMLElement) => el.innerHTML
    );

    const { result } = stripHtml(htmlContent);
    about = result.trim();
  } catch (_e) {
    console.log("⚠️ Не удалось получить информацию о себе из резюме.");
  }

  // Имитируем скролл для просмотра остальной части резюме
  await humanBrowse(page);

  // Парсинг образования
  try {
    await humanDelay(300, 800);

    const htmlContent = await page.$eval(
      'div[data-qa="resume-education-block"]',
      (el: HTMLElement) => el.innerHTML
    );

    const { result } = stripHtml(htmlContent);
    education = result.trim();
  } catch (_e) {
    console.log("⚠️ Не удалось получить образование из резюме.");
  }

  // Парсинг курсов
  try {
    await humanDelay(300, 800);

    const htmlContent = await page.$eval(
      'div[data-qa="resume-education-courses-block"]',
      (el: HTMLElement) => el.innerHTML
    );

    const { result } = stripHtml(htmlContent);
    courses = result.trim();
  } catch (_e) {
    console.log("⚠️ Не удалось получить курсы из резюме.");
  }

  const resumeIdMatch = url.match(/\/resume\/([a-f0-9]+)/);
  if (resumeIdMatch?.[1]) {
    const resumeId = resumeIdMatch[1];
    const contactsUrl = `${HH_CONFIG.urls.baseUrl}/resume/contacts/${resumeId}?simHash=&goal=Contacts_Phone`;

    try {
      console.log(`📞 Получение контактов: ${contactsUrl}`);

      // Задержка перед запросом контактов (как будто думаем)
      await humanDelay(1000, 2500);

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

  // Финальная пауза перед переходом к следующему резюме
  await humanDelay(1500, 3000);

  return { experience, contacts, languages, about, education, courses };
}
