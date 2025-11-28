import type { Page } from "puppeteer";
import { stripHtml } from "string-strip-html";
import type { ResumeExperience } from "../types";
import { HH_CONFIG } from "./config";

export async function parseResumeExperience(
  page: Page,
  url: string,
): Promise<ResumeExperience> {
  console.log(`📄 Переход на страницу резюме: ${url}`);

  // Set up 403 error logging
  const log403Handler = async (response: {
    status: () => number;
    url: () => string;
    request: () => { method: () => string };
  }) => {
    if (response.status() === 403) {
      console.log(`🚫 403 FORBIDDEN: ${response.url()}`);
      console.log(`   Method: ${response.request().method()}`);
    }
  };

  page.on("response", log403Handler);

  // Переходим на страницу резюме, если мы еще не там
  if (page.url() !== url) {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }

  let experience = "";
  let languages = "";
  let about = "";
  let education = "";
  let courses = "";
  let contacts = null;
  let phone: string | null = null;

  // Парсинг опыта работы
  try {
    const experienceElement = await page.waitForSelector(
      'div[data-qa="resume-experience-block"]',
      {
        timeout: HH_CONFIG.timeouts.selector,
      },
    );

    if (experienceElement) {
      const htmlContent = await experienceElement.evaluate(
        (el: HTMLElement) => el.innerHTML,
      );

      const { result } = stripHtml(htmlContent);
      experience = result.trim();
    }
  } catch (_e) {
    console.log("⚠️ Не удалось получить опыт работы из резюме.");
  }

  // Парсинг языков
  try {
    const languagesElement = await page.$(
      'div[data-qa="resume-languages-block"]',
    );
    if (languagesElement) {
      const htmlContent = await languagesElement.evaluate(
        (el: HTMLElement) => el.innerHTML,
      );
      const { result } = stripHtml(htmlContent);
      languages = result.trim();
    }
  } catch (_e) {
    console.log("⚠️ Не удалось получить языки из резюме.");
  }

  // Парсинг информации о себе
  try {
    const aboutElement = await page.$('div[data-qa="resume-about-block"]');
    if (aboutElement) {
      const htmlContent = await aboutElement.evaluate(
        (el: HTMLElement) => el.innerHTML,
      );
      const { result } = stripHtml(htmlContent);
      about = result.trim();
    }
  } catch (_e) {
    console.log("⚠️ Не удалось получить информацию о себе из резюме.");
  }

  // Парсинг образования
  try {
    const educationElement = await page.$(
      'div[data-qa="resume-education-block"]',
    );
    if (educationElement) {
      const htmlContent = await educationElement.evaluate(
        (el: HTMLElement) => el.innerHTML,
      );
      const { result } = stripHtml(htmlContent);
      education = result.trim();
    }
  } catch (_e) {
    console.log("⚠️ Не удалось получить образование из резюме.");
  }

  // Парсинг курсов
  try {
    const coursesElement = await page.$(
      'div[data-qa="resume-education-courses-block"]',
    );
    if (coursesElement) {
      const htmlContent = await coursesElement.evaluate(
        (el: HTMLElement) => el.innerHTML,
      );
      const { result } = stripHtml(htmlContent);
      courses = result.trim();
    }
  } catch (_e) {
    console.log("⚠️ Не удалось получить курсы из резюме.");
  }

  const resumeIdMatch = url.match(/\/resume\/([a-f0-9]+)/);
  if (resumeIdMatch?.[1] && HH_CONFIG.features.parseContacts) {
    const resumeId = resumeIdMatch[1];

    try {
      console.log(`📞 Проверка наличия контактов для резюме ${resumeId}`);

      // Check if the phone button exists first
      const phoneLink = await page.$(
        'a[data-qa="response-resume_show-phone-number"]',
      );

      if (!phoneLink) {
        console.log("⚠️ Кнопка показа телефона не найдена, пропускаем.");
      } else {
        // Set up request interception to capture the contacts response
        const contactsPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            page.off("response", responseHandler);
            console.log("⚠️ Таймаут ожидания контактов, продолжаем без них");
            resolve(null);
          }, HH_CONFIG.timeouts.contacts);

          const responseHandler = async (response: {
            url: () => string;
            json: () => Promise<unknown>;
          }) => {
            const url = response.url();
            if (
              url.includes(`/resume/contacts/${resumeId}`) &&
              url.includes("goal=Contacts_Phone")
            ) {
              clearTimeout(timeout);
              page.off("response", responseHandler);
              try {
                const data = await response.json();
                resolve(data);
              } catch (e) {
                reject(e);
              }
            }
          };

          page.on("response", responseHandler);
        });

        // Small delay to mimic human behavior
        await new Promise((resolve) => setTimeout(resolve, 500));
        await phoneLink.click();

        try {
          contacts = await contactsPromise;
          console.log("✅ Контакты получены");

          // Парсим телефон из контактов
          if (contacts && typeof contacts === "object" && "phone" in contacts) {
            const phoneData = (
              contacts as {
                phone?: Array<{ formatted?: string; raw?: string }>;
              }
            ).phone;
            if (Array.isArray(phoneData) && phoneData.length > 0) {
              const firstPhone = phoneData[0];
              phone = firstPhone?.formatted || firstPhone?.raw || null;
              if (phone) {
                console.log(`📞 Телефон извлечен: ${phone}`);
              }
            }
          }
        } catch (_e) {
          console.log("⚠️ Таймаут ожидания контактов, продолжаем без них.");
        }
      }
    } catch (e) {
      console.log("⚠️ Не удалось получить контакты.");
      if (e instanceof Error) {
        console.log(`   Причина: ${e.message}`);
      }
    }
  } else if (resumeIdMatch?.[1]) {
    console.log("ℹ️ Парсинг контактов отключен в конфигурации");
  } else {
    console.log("⚠️ Не удалось извлечь ID резюме из URL.");
  }

  // Clean up the 403 logging handler
  page.off("response", log403Handler);

  return { experience, contacts, phone, languages, about, education, courses };
}
